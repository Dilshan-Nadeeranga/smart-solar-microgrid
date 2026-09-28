using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SolarGrid.Api.Models;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Tests;

public class QrTokenServiceTests
{
    private const string Key = "unit-test-qr-key-0123456789-abcdefghijklmnop";
    private const string OtherKey = "another-unit-test-key-9876543210-zyxwvutsrqpo";

    private static readonly DateTimeOffset Now = new(2026, 9, 28, 8, 0, 0, TimeSpan.Zero);

    private readonly FakeTimeProvider _time = new(Now);

    private static EnergyReservation Reservation() => new()
    {
        Id = "6660a1f28a1b2c3d4e5f6b01",
        ProsumerId = "200012345678",
        StationId = "665f1b9a8a1b2c3d4e5f6a70",
        SlotId = "665f1c2e8a1b2c3d4e5f6a7b",
        Status = ReservationStatus.Approved,
        Version = 2
    };

    // Slot tomorrow 08:00-09:00 UTC.
    private static EnergyBookingSlot Slot() => new()
    {
        Id = "665f1c2e8a1b2c3d4e5f6a7b",
        StationId = "665f1b9a8a1b2c3d4e5f6a70",
        StartTimeUtc = Now.UtcDateTime.AddDays(1),
        EndTimeUtc = Now.UtcDateTime.AddDays(1).AddHours(1),
        MaximumBookings = 5,
        ReservedBookings = 1
    };

    private QrTokenService Service(string? key = Key, TimeSpan? afterEnd = null) =>
        new(
            new QrOptions
            {
                SecretKey = key,
                ValidAfterSlotEnd = afterEnd ?? TimeSpan.Zero
            },
            _time);

    // ----- Valid -----

    [Fact]
    public void Valid_token_round_trips_all_payload_fields()
    {
        var service = Service();
        var reservation = Reservation();
        var slot = Slot();

        var token = service.GenerateToken(reservation, slot);
        var result = service.ValidateToken(token.Payload);

        Assert.Equal(QrValidationStatus.Valid, result.Status);
        Assert.True(result.IsValid);
        Assert.NotNull(result.Payload);
        Assert.Equal(reservation.Id, result.Payload!.ReservationId);
        Assert.Equal(reservation.ProsumerId, result.Payload.ProsumerId);
        Assert.Equal(reservation.StationId, result.Payload.StationId);
        Assert.Equal(reservation.SlotId, result.Payload.SlotId);
        Assert.Equal(Now.UtcDateTime, result.Payload.IssuedAtUtc);
        Assert.Equal(slot.EndTimeUtc, result.Payload.ExpiresAtUtc);
        Assert.False(string.IsNullOrWhiteSpace(result.Payload.Nonce));
    }

    [Fact]
    public void Token_is_two_base64url_segments_without_padding()
    {
        var token = Service().GenerateToken(Reservation(), Slot()).Payload;

        var parts = token.Split('.');
        Assert.Equal(2, parts.Length);
        Assert.All(parts, part =>
        {
            Assert.NotEmpty(part);
            Assert.DoesNotContain('=', part);
            Assert.DoesNotContain('+', part);
            Assert.DoesNotContain('/', part);
        });

        // HMAC-SHA256 signature is 32 bytes.
        Assert.Equal(32, Base64Url.DecodeFromChars(parts[1]).Length);
    }

    [Fact]
    public void Token_does_not_contain_the_secret_key()
    {
        var token = Service().GenerateToken(Reservation(), Slot()).Payload;
        var json = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(token.Split('.')[0]));

        Assert.DoesNotContain(Key, token);
        Assert.DoesNotContain(Key, json);
    }

    [Fact]
    public void Each_token_gets_a_new_nonce()
    {
        var service = Service();

        var first = service.GenerateToken(Reservation(), Slot()).Payload;
        var second = service.GenerateToken(Reservation(), Slot()).Payload;

        Assert.NotEqual(first, second);
        Assert.NotEqual(
            service.ValidateToken(first).Payload!.Nonce,
            service.ValidateToken(second).Payload!.Nonce);
    }

    [Fact]
    public void Leading_and_trailing_whitespace_from_scanner_is_ignored()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;

        Assert.True(service.ValidateToken($"  {token}\n").IsValid);
    }

    // ----- Tampered -----

    [Fact]
    public void Tampered_payload_is_rejected()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;
        var parts = token.Split('.');

        // Change the reservation id, keep the original signature.
        var json = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(parts[0]));
        var forgedJson = json.Replace("6660a1f28a1b2c3d4e5f6b01", "6660a1f28a1b2c3d4e5f6b99");
        Assert.NotEqual(json, forgedJson);

        var forged = Base64Url.EncodeToString(Encoding.UTF8.GetBytes(forgedJson)) + "." + parts[1];

        var result = service.ValidateToken(forged);

        Assert.Equal(QrValidationStatus.InvalidSignature, result.Status);
        Assert.Null(result.Payload);
    }

    [Fact]
    public void Tampered_expiry_is_rejected()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;
        var parts = token.Split('.');

        var payload = JsonSerializer.Deserialize<QrPayload>(Base64Url.DecodeFromChars(parts[0]))!;
        var extended = payload with { ExpiresAtUtc = payload.ExpiresAtUtc.AddYears(1) };
        var forged = Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(extended))
            + "." + parts[1];

        Assert.Equal(QrValidationStatus.InvalidSignature, service.ValidateToken(forged).Status);
    }

    [Fact]
    public void Tampered_signature_is_rejected()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;
        var parts = token.Split('.');

        var signature = Base64Url.DecodeFromChars(parts[1]);
        signature[0] ^= 0xFF;
        var forged = parts[0] + "." + Base64Url.EncodeToString(signature);

        Assert.Equal(QrValidationStatus.InvalidSignature, service.ValidateToken(forged).Status);
    }

    [Fact]
    public void Truncated_signature_is_rejected()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;
        var parts = token.Split('.');

        var shortSignature = Base64Url.DecodeFromChars(parts[1])[..16];
        var forged = parts[0] + "." + Base64Url.EncodeToString(shortSignature);

        Assert.Equal(QrValidationStatus.InvalidSignature, service.ValidateToken(forged).Status);
    }

    [Fact]
    public void Token_signed_with_a_different_key_is_rejected()
    {
        var forger = Service(OtherKey);
        var forged = forger.GenerateToken(Reservation(), Slot()).Payload;

        Assert.Equal(QrValidationStatus.InvalidSignature, Service().ValidateToken(forged).Status);
    }

    [Fact]
    public void Correctly_signed_but_non_json_payload_is_malformed()
    {
        var segment = Base64Url.EncodeToString(Encoding.UTF8.GetBytes("not json"));
        var signature = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(Key),
            Encoding.ASCII.GetBytes(segment));
        var token = segment + "." + Base64Url.EncodeToString(signature);

        Assert.Equal(QrValidationStatus.Malformed, Service().ValidateToken(token).Status);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("no-dot-here")]
    [InlineData(".")]
    [InlineData("abc.")]
    [InlineData(".abc")]
    [InlineData("a.b.c")]
    [InlineData("abc.!!!notbase64!!!")]
    public void Malformed_input_is_rejected(string? token)
    {
        Assert.Equal(QrValidationStatus.Malformed, Service().ValidateToken(token).Status);
    }

    [Fact]
    public void Oversized_input_is_rejected()
    {
        var token = new string('A', 5000) + "." + new string('B', 43);

        Assert.Equal(QrValidationStatus.Malformed, Service().ValidateToken(token).Status);
    }

    // ----- Expired -----

    [Fact]
    public void Token_is_valid_until_just_before_slot_end()
    {
        var service = Service();
        var slot = Slot();
        var token = service.GenerateToken(Reservation(), slot).Payload;

        _time.Now = new DateTimeOffset(slot.EndTimeUtc).AddSeconds(-1);

        Assert.Equal(QrValidationStatus.Valid, service.ValidateToken(token).Status);
    }

    [Fact]
    public void Token_expires_at_slot_end()
    {
        var service = Service();
        var slot = Slot();
        var token = service.GenerateToken(Reservation(), slot).Payload;

        _time.Now = new DateTimeOffset(slot.EndTimeUtc);

        var result = service.ValidateToken(token);
        Assert.Equal(QrValidationStatus.Expired, result.Status);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Token_is_expired_long_after_slot_end()
    {
        var service = Service();
        var token = service.GenerateToken(Reservation(), Slot()).Payload;

        _time.Advance(TimeSpan.FromDays(3));

        Assert.Equal(QrValidationStatus.Expired, service.ValidateToken(token).Status);
    }

    [Fact]
    public void Configured_grace_after_slot_end_extends_expiry()
    {
        var service = Service(afterEnd: TimeSpan.FromMinutes(30));
        var slot = Slot();
        var token = service.GenerateToken(Reservation(), slot);

        Assert.Equal(slot.EndTimeUtc.AddMinutes(30), token.ExpiresAtUtc);

        _time.Now = new DateTimeOffset(slot.EndTimeUtc).AddMinutes(29);
        Assert.Equal(QrValidationStatus.Valid, service.ValidateToken(token.Payload).Status);

        _time.Now = new DateTimeOffset(slot.EndTimeUtc).AddMinutes(30);
        Assert.Equal(QrValidationStatus.Expired, service.ValidateToken(token.Payload).Status);
    }

    [Fact]
    public void Forged_expired_token_reports_signature_problem_not_expiry()
    {
        var service = Service();
        var forged = Service(OtherKey).GenerateToken(Reservation(), Slot()).Payload;

        _time.Advance(TimeSpan.FromDays(3));

        Assert.Equal(QrValidationStatus.InvalidSignature, service.ValidateToken(forged).Status);
    }

    // ----- Configuration -----

    [Fact]
    public void Missing_key_does_not_break_startup_but_blocks_qr_use()
    {
        var service = Service(key: null);

        Assert.Throws<QrNotConfiguredException>(() => service.GenerateToken(Reservation(), Slot()));
        Assert.Throws<QrNotConfiguredException>(() => service.ValidateToken("a.b"));
    }

    [Fact]
    public void Short_key_is_refused()
    {
        Assert.Throws<InvalidOperationException>(() => Service(key: "too-short"));
    }
}
