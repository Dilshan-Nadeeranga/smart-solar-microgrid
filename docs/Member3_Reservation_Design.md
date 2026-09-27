# Member 3 - Reservation Management

## User Story

As a prosumer, I want to create, modify and cancel energy-slot
reservations, so that I can arrange my energy transactions around
my schedule.

## Scope

### Member 3 owns
- Create a reservation
- Get reservation details for summary and edit screens
- Update the slot of an eligible reservation
- Cancel an eligible reservation
- Reserve and release slot capacity safely

### Member 4 owns
- Reservation lists, search and history
- Dashboard counts
- Approval and rejection
- QR verification
- Transfer completion

## Clients

### Android (Prosumer)
- Booking form
- Edit and cancel actions
- Booking summary screens

### Website (Backoffice / Grid Operator)
- Create, edit and cancel bookings on behalf of prosumers
- Action summary screens

## Architecture

Web -> C# API -> MongoDB

Android -> C# API -> MongoDB

## API Files

| File | Responsibility |
|------|----------------|
| Models/EnergyReservation.cs | Reservation data structure |
| Models/ReservationStatus.cs | Reservation status values |
| Controllers/ReservationsController.cs | HTTP requests and responses |
| Services/ReservationService.cs | Booking rules and workflow |
| Services/ReservationException.cs | Maps rule failures to HTTP status codes |
| Repositories/ReservationRepository.cs | MongoDB operations and transactions |

Authentication and MongoDB configuration come from Member 1.
Stations, slots and schedules come from Member 2.

## Shared Data Agreement

| Data | Fields used by Member 3 | Owner |
|------|-------------------------|-------|
| Station | Id, IsActive | Member 2 |
| Energy slot | Id, StationId, StartTimeUtc, EndTimeUtc, MaximumBookings, ReservedBookings, IsActive | Member 2 |
| Station schedule | StationId, Day, OpeningTime, ClosingTime, IsAvailable | Member 2 |
| User | NIC, Role, AccountStatus | Member 1 |
| Reservation | All fields | Member 3 (shared with Member 4) |

## Design Decisions

### Capacity
- Capacity means number of bookings.
- One reservation consumes one booking space.
- A slot is full when ReservedBookings equals MaximumBookings.

### Statuses that consume capacity
- Pending
- Approved

Cancelled, Rejected and Completed reservations do not consume capacity.

### Seven-day rule
Rolling seven-day period using the server clock (UTC):

```
current server time < slot start time <= current server time + 7 days
```

### Twelve-hour rule
Update and cancellation are allowed only when at least 12 hours remain
before the existing booking starts. Exactly 12 hours is allowed.

### Operating schedule
- The slot must fall inside the station schedule for that day.
- If the schedule for that day is marked unavailable, booking is rejected.
- If no schedule is configured for that day, the slot is allowed.

### Changing an approved booking
An updated reservation always returns to Pending.
Member 4 must treat the previous approval and QR authorization as invalid.

### Cancelled records
Cancelled reservations are kept for history. They are never deleted.

## Conflict Rules

| Conflict | Action |
|----------|--------|
| Same prosumer already has an active reservation for the same slot | Reject (409) |
| Slot has no remaining capacity | Reject (409) |
| Same prosumer has an overlapping active booking | Reject (409) |
| Two requests update/cancel the same reservation | Version check rejects the second (409) |
| Reservation already cancelled | Reject without releasing capacity again (409) |

Overlap exists when:

```
new start < existing end AND new end > existing start
```

Back-to-back bookings do not overlap.

## Capacity Protection

A simple "check availability, then insert" is not safe because two
requests could both see the last space.

Each write runs in one MongoDB transaction:

### Create
1. Conditionally increment ReservedBookings only if
   ReservedBookings < MaximumBookings and the slot is active.
2. Insert the reservation.
3. Commit both, or roll back both.

### Update
1. Release one space from the old slot.
2. Reserve one space in the new slot (conditional).
3. Replace the reservation only if its Version is unchanged.
4. Commit all, or roll back all.

If the new slot is full, the transaction aborts and the original
reservation and capacity stay unchanged.

### Cancel
1. Confirm the reservation is not already cancelled.
2. Release one space from the slot.
3. Set status to Cancelled only if its Version is unchanged.
4. Commit both, or roll back both.

MongoDB transactions require a replica set. MongoDB Atlas clusters
provide this by default.

## Reservation Lifecycle

```
Create
   |
   v
Pending ----------------------> Cancelled
   |          (Member 3)
   | Member 4 approval
   v
Approved ---------------------> Cancelled
   |          (Member 3)
   | Member 3 update
   v
Pending

Member 4 can also move a reservation to Rejected or Completed.
Rejected, Completed and Cancelled reservations cannot be updated.
```

## Integration Notes

- Member 2's station deactivation must check real reservations.
  Use `ReservationRepository.HasActiveForStationAsync(stationId)`
  instead of the placeholder check.
- Member 2 must not reduce MaximumBookings below the current
  ReservedBookings of a slot.
- Member 4 reads the shared `EnergyReservations` collection and must
  increment `Version` and update `UpdatedAtUtc` on every status change.
