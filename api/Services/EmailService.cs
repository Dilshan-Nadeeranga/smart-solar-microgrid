using System.Net;
using System.Net.Mail;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(EmailSettings settings, ILogger<EmailService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task SendOtpEmailAsync(string toEmail, string otp)
    {
        try
        {
            var message = new MailMessage
            {
                From = new MailAddress(_settings.FromEmail, _settings.FromName),
                Subject = "Smart Solar Microgrid - Email Verification",
                Body = $"Smart Solar Microgrid\n\nYour email verification OTP is:\n\n{otp}\n\nThis OTP expires in approximately 10 minutes.\n",
                IsBodyHtml = false
            };

            message.To.Add(new MailAddress(toEmail));

            using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
            {
                Credentials = new NetworkCredential(_settings.SmtpUsername, _settings.SmtpPassword),
                EnableSsl = true
            };

            await client.SendMailAsync(message);
            _logger.LogInformation($"OTP email sent successfully to {toEmail}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send OTP email to {Email}", toEmail);
            throw new InvalidOperationException("Failed to send email. Please check SMTP configuration.");
        }
    }
}
