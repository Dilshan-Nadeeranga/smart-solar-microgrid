using System.ComponentModel.DataAnnotations;

namespace SolarGrid.Api.Models;

public class ResendOtpRequest
{
    [Required]
    public string RegistrationId { get; set; } = string.Empty;
}
