using SolarGrid.Api.Models;

namespace SolarGrid.Api.DTOs;

/// <summary>
/// One reservation with its station and slot details.
/// Same fields as Member 3's summary plus Member 4 fields.
/// </summary>
public class ReservationDetailsDto
{
    public string Id { get; set; } = string.Empty;
    public string ProsumerId { get; set; } = string.Empty;
    public string StationId { get; set; } = string.Empty;
    public string? StationName { get; set; }
    public string SlotId { get; set; } = string.Empty;
    public ReservationStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? CompletedByOperatorId { get; set; }
    public long Version { get; set; }
    public DateTime? SlotStartTimeUtc { get; set; }
    public DateTime? SlotEndTimeUtc { get; set; }
    public int? RemainingBookings { get; set; }
}

/// <summary>
/// Approve, reject and complete responses. Same shape as Member 3.
/// </summary>
public class ReservationActionResponse
{
    public string Message { get; set; } = string.Empty;
    public string ReservationId { get; set; } = string.Empty;
    public ReservationDetailsDto Reservation { get; set; } = new();
}

public class ReservationPageResponse
{
    public string Message { get; set; } = string.Empty;
    public List<ReservationDetailsDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalCount { get; set; }
    public int TotalPages { get; set; }
}

public class ReservationSummaryResponse
{
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// "Own" for a prosumer, "All" for staff.
    /// </summary>
    public string Scope { get; set; } = string.Empty;

    public long PendingCount { get; set; }
    public long ApprovedFutureCount { get; set; }
}

public class QrCodeDto
{
    /// <summary>
    /// String to render as the QR image on the client.
    /// </summary>
    public string Payload { get; set; } = string.Empty;

    public DateTime IssuedAtUtc { get; set; }

    /// <summary>
    /// Scans are accepted from this time (before slot start).
    /// </summary>
    public DateTime ValidFromUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; }
}

public class QrCodeResponse
{
    public string Message { get; set; } = string.Empty;
    public string ReservationId { get; set; } = string.Empty;
    public QrCodeDto Qr { get; set; } = new();
}

public class QrProsumerDto
{
    public string Nic { get; set; } = string.Empty;
    public string? Name { get; set; }
}

public class QrVerificationResponse
{
    public string Message { get; set; } = string.Empty;
    public string ReservationId { get; set; } = string.Empty;
    public ReservationDetailsDto Reservation { get; set; } = new();
    public QrProsumerDto Prosumer { get; set; } = new();
    public DateTime QrIssuedAtUtc { get; set; }
    public DateTime QrExpiresAtUtc { get; set; }
}
