using SolarGrid.Api.Models;

namespace SolarGrid.Api.Services;

public enum ReservationAction
{
    Approve,
    Reject,
    Complete
}

/// <summary>
/// Member 4 status transitions. Pure functions so they can be unit tested.
///
///   Pending --approve--> Approved --complete--> Completed
///   Pending --reject---> Rejected
/// </summary>
public static class ReservationStatusRules
{
    /// <summary>
    /// Pending and Approved hold a place in EnergyBookingSlots.ReservedBookings.
    /// </summary>
    public static bool ConsumesCapacity(ReservationStatus status) =>
        status is ReservationStatus.Pending or ReservationStatus.Approved;

    public static ReservationStatus RequiredStatus(ReservationAction action) => action switch
    {
        ReservationAction.Approve => ReservationStatus.Pending,
        ReservationAction.Reject => ReservationStatus.Pending,
        ReservationAction.Complete => ReservationStatus.Approved,
        _ => throw new ArgumentOutOfRangeException(nameof(action))
    };

    public static ReservationStatus TargetStatus(ReservationAction action) => action switch
    {
        ReservationAction.Approve => ReservationStatus.Approved,
        ReservationAction.Reject => ReservationStatus.Rejected,
        ReservationAction.Complete => ReservationStatus.Completed,
        _ => throw new ArgumentOutOfRangeException(nameof(action))
    };

    public static bool CanTransition(ReservationStatus current, ReservationAction action) =>
        current == RequiredStatus(action);

    /// <summary>
    /// True when the transition must decrement ReservedBookings by one.
    /// </summary>
    public static bool ReleasesCapacity(ReservationAction action) =>
        ConsumesCapacity(RequiredStatus(action)) && !ConsumesCapacity(TargetStatus(action));

    public static bool CanIssueQr(ReservationStatus status) =>
        status == ReservationStatus.Approved;

    /// <summary>
    /// Message for a transition that is not allowed from the current status.
    /// </summary>
    public static string BlockedMessage(ReservationStatus current, ReservationAction action)
    {
        return (action, current) switch
        {
            (ReservationAction.Approve, ReservationStatus.Approved) =>
                "Reservation is already approved.",
            (ReservationAction.Reject, ReservationStatus.Rejected) =>
                "Reservation is already rejected. Capacity was not released again.",
            (ReservationAction.Complete, ReservationStatus.Completed) =>
                "Reservation is already completed. Capacity was not released again.",
            (ReservationAction.Complete, ReservationStatus.Pending) =>
                "Only an approved reservation can be completed. This reservation is still pending.",
            (ReservationAction.Complete, _) =>
                $"Cannot complete a {current.ToString().ToLowerInvariant()} reservation.",
            _ =>
                $"Only a pending reservation can be {Verb(action)}. Current status: {current}."
        };
    }

    private static string Verb(ReservationAction action) => action switch
    {
        ReservationAction.Approve => "approved",
        ReservationAction.Reject => "rejected",
        _ => "completed"
    };
}
