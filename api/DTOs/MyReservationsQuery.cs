namespace SolarGrid.Api.DTOs;

/// <summary>
/// GET /api/reservations/mine query string. ProsumerId always comes from the token.
/// </summary>
public class MyReservationsQuery
{
    /// <summary>
    /// Pending, Approved, Cancelled, Rejected or Completed.
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// UTC date of the slot start, e.g. 2026-09-30.
    /// </summary>
    public string? DateUtc { get; set; }

    /// <summary>
    /// Station name text or a full reservation id.
    /// </summary>
    public string? Q { get; set; }

    public int? Page { get; set; }
    public int? PageSize { get; set; }
}
