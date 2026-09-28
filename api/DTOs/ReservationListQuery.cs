namespace SolarGrid.Api.DTOs;

/// <summary>
/// GET /api/reservations query string for staff.
/// </summary>
public class ReservationListQuery
{
    /// <summary>
    /// Pending, Approved, Cancelled, Rejected or Completed.
    /// </summary>
    public string? Status { get; set; }

    public string? StationId { get; set; }

    /// <summary>
    /// UTC date of the slot start, e.g. 2026-09-30.
    /// </summary>
    public string? DateUtc { get; set; }

    /// <summary>
    /// Booking reference: the full reservation id.
    /// </summary>
    public string? Reference { get; set; }

    /// <summary>
    /// Station name text or a full reservation id.
    /// </summary>
    public string? Q { get; set; }

    public int? Page { get; set; }
    public int? PageSize { get; set; }
}
