namespace SolarGrid.Api.DTOs;

/// <summary>
/// Optional body for approve, reject and complete.
/// Only Version is read. Status, timestamps and capacity from clients are ignored.
/// </summary>
public class ReservationActionRequest
{
    /// <summary>
    /// Version from the last GET. If sent and it no longer matches, the API returns 409.
    /// </summary>
    public long? Version { get; set; }
}
