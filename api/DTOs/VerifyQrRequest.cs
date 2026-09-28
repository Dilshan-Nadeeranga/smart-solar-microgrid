namespace SolarGrid.Api.DTOs;

public class VerifyQrRequest
{
    /// <summary>
    /// The scanned QR string: Base64Url(payload) + "." + Base64Url(signature).
    /// </summary>
    public string? Payload { get; set; }
}
