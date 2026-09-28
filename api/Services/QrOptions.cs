namespace SolarGrid.Api.Services;

/// <summary>
/// QR signing settings loaded from the root .env file.
/// </summary>
public class QrOptions
{
    public const int MinimumKeyBytes = 32;

    /// <summary>
    /// HMAC-SHA256 key (QR_SECRET_KEY). Never returned to clients.
    /// </summary>
    public string? SecretKey { get; set; }

    /// <summary>
    /// How long before the slot starts a scan is accepted (QR_VALID_BEFORE_START_MINUTES).
    /// </summary>
    public TimeSpan ValidBeforeSlotStart { get; set; } = TimeSpan.FromHours(2);

    /// <summary>
    /// How long after the slot ends the QR code stays valid (QR_VALID_AFTER_END_MINUTES).
    /// </summary>
    public TimeSpan ValidAfterSlotEnd { get; set; } = TimeSpan.Zero;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}
