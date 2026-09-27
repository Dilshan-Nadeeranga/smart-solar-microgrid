# Reservation Collection Design

## Purpose

The EnergyReservations collection stores energy-slot bookings made by
prosumers or by staff on their behalf.

It is shared by Member 3 (create, update, cancel) and Member 4
(lists, approval, QR verification, completion).

## Collection Name

```
EnergyReservations
```

## Fields

| Field | Type | Purpose | Controlled by |
|-------|------|---------|---------------|
| Id | ObjectId | Unique reservation identifier | Server |
| ProsumerId | string (NIC) | Owner of the reservation | Server determines or verifies |
| StationId | ObjectId | Selected station | Server copies from the slot |
| SlotId | ObjectId | Selected energy slot | Client selects, server validates |
| Status | string | Pending, Approved, Cancelled, Rejected or Completed | Server |
| CreatedAtUtc | DateTime | Creation timestamp | Server |
| UpdatedAtUtc | DateTime | Last modification timestamp | Server |
| CancelledAtUtc | DateTime? | Cancellation timestamp, if cancelled | Server |
| Version | long | Detects simultaneous changes | Server |

## Status Values

| Status | Consumes capacity | Set by |
|--------|-------------------|--------|
| Pending | Yes | Member 3 (create, update) |
| Approved | Yes | Member 4 |
| Cancelled | No | Member 3 |
| Rejected | No | Member 4 |
| Completed | No | Member 4 |

## Version Rule

- A new reservation starts at Version 1.
- Every change increments Version by 1.
- Updates only succeed when the stored Version still matches the
  Version that was read. Otherwise the request is rejected with 409.

## Related Collections

| Collection | Owner | Used for |
|------------|-------|----------|
| Users | Member 1 | Prosumer NIC, role, account status |
| SolarStationInfo | Member 2 | Station active status |
| EnergyBookingSlots | Member 2 | Slot times and capacity (ReservedBookings) |
| StationSchedules | Member 2 | Operating hours per day |

## Capacity Link

`EnergyBookingSlots.ReservedBookings` must always equal the number of
Pending and Approved reservations for that slot.

Member 3 changes ReservedBookings only inside the same transaction as
the reservation change. Member 4 must release capacity in the same way
when rejecting a reservation.

## Example Document

```json
{
  "_id": { "$oid": "6660a1f28a1b2c3d4e5f6b01" },
  "ProsumerId": "200012345678",
  "StationId": { "$oid": "665f1b9a8a1b2c3d4e5f6a70" },
  "SlotId": { "$oid": "665f1c2e8a1b2c3d4e5f6a7b" },
  "Status": 0,
  "CreatedAtUtc": { "$date": "2026-09-27T10:00:00Z" },
  "UpdatedAtUtc": { "$date": "2026-09-27T10:00:00Z" },
  "CancelledAtUtc": null,
  "Version": 1
}
```

Status is stored as its enum number:
0 Pending, 1 Approved, 2 Cancelled, 3 Rejected, 4 Completed.
