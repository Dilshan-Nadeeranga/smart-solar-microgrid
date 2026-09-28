namespace SolarGrid.Api.Services;

public interface IEmailService
{
    Task SendOtpEmailAsync(string toEmail, string otp);
}
