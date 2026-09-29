using System.Text.RegularExpressions;

namespace SolarGrid.Api.Services;

public static class NicValidationHelper
{
    private static readonly Regex NicRegex = new Regex(@"^(?:[0-9]{9}[VvXx]|[0-9]{12})$", RegexOptions.Compiled);

    public static bool IsValid(string nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
            return false;

        var normalized = nic.Trim();
        return NicRegex.IsMatch(normalized);
    }

    public static string Normalize(string nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
            return string.Empty;

        return nic.Trim().ToUpper();
    }
}
