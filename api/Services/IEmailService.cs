namespace SolarGrid.Api.Services;

public interface IEmailService
{
    Task SendOtpEmailAsync(string toEmail, string otp);
    Task SendEmailAsync(string toEmail, string subject, string body);
}
