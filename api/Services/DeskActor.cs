using System.Security.Claims;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Services;

/// <summary>
/// The web reservation desk has no login yet. These calls run with Backoffice rules.
/// </summary>
public static class DeskActor
{
    public static ClaimsPrincipal Create() =>
        new(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "backoffice-desk"),
                new Claim(ClaimTypes.Role, Role.BACKOFFICE.ToString()),
            ],
            authenticationType: "Desk"));
}
