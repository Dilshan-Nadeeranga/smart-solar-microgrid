using System.ComponentModel.DataAnnotations;

namespace SolarGrid.Api.Models;

public class VerifyOtpRequest
{
    [Required]
    public string RegistrationId { get; set; } = string.Empty;

    [Required]
    public string Otp { get; set; } = string.Empty;
}
