using SolarGrid.Api.Models;

namespace SolarGrid.Api.Services;

/// <summary>
/// Member 4 role rules in one place.
/// </summary>
public static class ReservationPermissions
{
    /// <summary>
    /// Roles that may approve or reject a pending reservation.
    /// TODO: Confirm the approving role with the lecturer. The brief does not
    /// clearly assign it, so both staff roles are allowed for now.
    /// </summary>
    public static readonly IReadOnlyList<Role> Approvers =
        [Role.BACKOFFICE, Role.GRID_OPERATOR];

    /// <summary>
    /// Roles that see operational (all-prosumer) lists and counts.
    /// </summary>
    public static readonly IReadOnlyList<Role> Staff =
        [Role.BACKOFFICE, Role.GRID_OPERATOR];

    /// <summary>
    /// Roles that may verify QR codes and complete energy transfers.
    /// </summary>
    public static readonly IReadOnlyList<Role> TransferOperators =
        [Role.GRID_OPERATOR];
}
