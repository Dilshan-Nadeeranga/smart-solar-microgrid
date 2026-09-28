# Member 4 - Collection Design

## EnergyReservations

### Purpose

Member 4 reads and updates the same reservation documents created by Member 3.
It does not create a separate booking collection.

Collection name:
EnergyReservations

### Shared Fields

Id
ProsumerId
StationId
SlotId
Status
CreatedAtUtc
UpdatedAtUtc
CancelledAtUtc
Version

Status values:
Pending
Approved
Rejected
Cancelled
Completed

### Fields Member 4 Records

ApprovedAtUtc
RejectedAtUtc
CompletedAtUtc
CompletedByOperatorId

CompletedAtUtc and CompletedByOperatorId are set once,
when a Grid Operator completes a verified energy transfer.

### QR Payload

The QR code is not a second booking record.
The API signs a short-lived payload that identifies the reservation.
Verification checks that signature against the EnergyReservations document.

### Access Rule

A prosumer query is always limited to ProsumerId of the signed-in user.
Staff queries may filter by station, date, reference, and status.
