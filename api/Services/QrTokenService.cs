using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Services;

public interface IQrTokenService
{
    /// <summary>
    /// Signs a short-lived QR payload for an approved reservation.
    /// </summary>
    QrToken GenerateToken(EnergyReservation reservation, EnergyBookingSlot slot);

    /// <summary>
    /// Checks format, signature and expiry. Does not read the database.
    /// </summary>
    QrValidationResult ValidateToken(string? token);
}

/// <summary>
/// Signed data inside the QR code. Base64Url encoded, so it is readable
/// but cannot be changed without breaking the signature.
/// </summary>
public sealed record QrPayload(
    [property: JsonPropertyName("reservationId")] string ReservationId,
    [property: JsonPropertyName("prosumerId")] string ProsumerId,
    [property: JsonPropertyName("stationId")] string StationId,
    [property: JsonPropertyName("slotId")] string SlotId,
    [property: JsonPropertyName("issuedAtUtc")] DateTime IssuedAtUtc,
    [property: JsonPropertyName("expiresAtUtc")] DateTime ExpiresAtUtc,
    [property: JsonPropertyName("nonce")] string Nonce);

public sealed record QrToken(string Payload, DateTime IssuedAtUtc, DateTime ExpiresAtUtc);

public enum QrValidationStatus
{
    Valid,
    Malformed,
    InvalidSignature,
    Expired
}

public sealed record QrValidationResult(QrValidationStatus Status, QrPayload? Payload)
{
    public bool IsValid => Status == QrValidationStatus.Valid;
}

/// <summary>
/// Thrown when QR_SECRET_KEY has not been configured.
/// </summary>
public sealed class QrNotConfiguredException : Exception
{
    public QrNotConfiguredException()
        : base("QR signing is not configured on the server.")
    {
    }
}

/// <summary>
/// QR string = Base64Url(payloadJson) + "." + Base64Url(HMAC-SHA256(payloadSegment)).
/// </summary>
public class QrTokenService : IQrTokenService
{
    // Large enough for any real payload, small enough to reject junk early.
    private const int MaxTokenLength = 2048;
    private const int NonceBytes = 16;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never
    };

    private readonly byte[]? _key;
    private readonly QrOptions _options;
    private readonly TimeProvider _time;

    public QrTokenService(QrOptions options, TimeProvider time)
    {
        _options = options;
        _time = time;

        if (options.IsConfigured)
        {
            var key = Encoding.UTF8.GetBytes(options.SecretKey!);
            if (key.Length < QrOptions.MinimumKeyBytes)
            {
                throw new InvalidOperationException(
                    $"QR_SECRET_KEY must be at least {QrOptions.MinimumKeyBytes} bytes long.");
            }

            _key = key;
        }
    }

    public QrToken GenerateToken(EnergyReservation reservation, EnergyBookingSlot slot)
    {
        var key = _key ?? throw new QrNotConfiguredException();

        var issuedAt = TruncateToSeconds(_time.GetUtcNow().UtcDateTime);
        var expiresAt = TruncateToSeconds(
            DateTime.SpecifyKind(slot.EndTimeUtc, DateTimeKind.Utc).Add(_options.ValidAfterSlotEnd));

        var payload = new QrPayload(
            reservation.Id,
            reservation.ProsumerId,
            reservation.StationId,
            reservation.SlotId,
            issuedAt,
            expiresAt,
            Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(NonceBytes)));

        var payloadSegment = Base64Url.EncodeToString(
            JsonSerializer.SerializeToUtf8Bytes(payload, JsonOptions));

        var signatureSegment = Base64Url.EncodeToString(Sign(key, payloadSegment));

        return new QrToken($"{payloadSegment}.{signatureSegment}", issuedAt, expiresAt);
    }

    public QrValidationResult ValidateToken(string? token)
    {
        var key = _key ?? throw new QrNotConfiguredException();

        if (string.IsNullOrWhiteSpace(token) || token.Length > MaxTokenLength)
        {
            return Fail(QrValidationStatus.Malformed);
        }

        var parts = token.Trim().Split('.');
        if (parts.Length != 2 || parts[0].Length == 0 || parts[1].Length == 0)
        {
            return Fail(QrValidationStatus.Malformed);
        }

        if (!TryDecode(parts[1], out var providedSignature))
        {
            return Fail(QrValidationStatus.Malformed);
        }

        // Signature is checked before the payload is parsed, in constant time.
        var expectedSignature = Sign(key, parts[0]);
        if (!CryptographicOperations.FixedTimeEquals(expectedSignature, providedSignature))
        {
            return Fail(QrValidationStatus.InvalidSignature);
        }

        if (!TryDecode(parts[0], out var payloadBytes))
        {
            return Fail(QrValidationStatus.Malformed);
        }

        QrPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<QrPayload>(payloadBytes, JsonOptions);
        }
        catch (JsonException)
        {
            return Fail(QrValidationStatus.Malformed);
        }

        if (payload is null ||
            string.IsNullOrWhiteSpace(payload.ReservationId) ||
            string.IsNullOrWhiteSpace(payload.ProsumerId) ||
            string.IsNullOrWhiteSpace(payload.StationId) ||
            string.IsNullOrWhiteSpace(payload.SlotId) ||
            string.IsNullOrWhiteSpace(payload.Nonce))
        {
            return Fail(QrValidationStatus.Malformed);
        }

        var now = _time.GetUtcNow().UtcDateTime;
        if (now >= payload.ExpiresAtUtc.ToUniversalTime())
        {
            return new QrValidationResult(QrValidationStatus.Expired, payload);
        }

        return new QrValidationResult(QrValidationStatus.Valid, payload);
    }

    private static byte[] Sign(byte[] key, string payloadSegment) =>
        HMACSHA256.HashData(key, Encoding.ASCII.GetBytes(payloadSegment));

    private static bool TryDecode(string segment, out byte[] bytes)
    {
        try
        {
            bytes = Base64Url.DecodeFromChars(segment);
            return true;
        }
        catch (FormatException)
        {
            bytes = [];
            return false;
        }
    }

    private static QrValidationResult Fail(QrValidationStatus status) => new(status, null);

    private static DateTime TruncateToSeconds(DateTime value) =>
        new(value.Ticks - value.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);
}
