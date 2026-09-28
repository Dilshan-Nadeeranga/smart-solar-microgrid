# Member 4 - API Design

Member 4 uses the reservation records created by Member 3.
Prosumers can access only their own bookings.

## Dashboard

### Get Booking Summary
Purpose:
Return pending reservation count and approved future reservation count
for the signed-in user. Staff receive operational counts.
A prosumer receives counts for their own bookings.

Endpoint:
GET /api/reservations/summary

Allowed:
- Backoffice
- Grid Operator
- Prosumer


## Reservation Lists

### Get My Bookings
Purpose:
Return the signed-in prosumer's current, pending, and historical bookings.
Supports search, status filter, date filter, and pagination.

Endpoint:
GET /api/reservations/mine?status={status}&dateUtc={date}&q={text}&page={page}&pageSize={size}

Allowed:
- Prosumer


### Get Reservations
Purpose:
Return reservations for authorized staff.
Supports search and filters by date, station, reference, and status,
plus pagination.

Endpoint:
GET /api/reservations?status={status}&stationId={id}&dateUtc={date}&reference={ref}&page={page}&pageSize={size}

Allowed:
- Backoffice
- Grid Operator


### Get Reservation
Purpose:
Return one reservation. Member 3 owns the details, edit, and cancel screens.
Member 4 opens this record from the booking list.

Endpoint:
GET /api/reservations/{id}

Allowed:
- Backoffice
- Grid Operator
- The prosumer who owns the reservation


## Approval

Confirm the approving role with the lecturer before implementation.

### Approve Reservation
Purpose:
Approve an eligible pending reservation.

Endpoint:
PATCH /api/reservations/{id}/approve

Allowed:
- Authorized staff


### Reject Reservation
Purpose:
Reject an eligible pending reservation and coordinate capacity
release with Member 3.

Endpoint:
PATCH /api/reservations/{id}/reject

Allowed:
- Authorized staff


## QR Verification

### Get Transaction QR
Purpose:
Return server-authorized QR payload for an approved reservation
owned by the signed-in prosumer.

Endpoint:
GET /api/reservations/{id}/qr

Allowed:
- The prosumer who owns an approved reservation


### Verify QR
Purpose:
Check a scanned QR payload against the reservation.
The API verifies the signature, Grid Operator permission,
and that the reservation is approved and not already completed.

Endpoint:
POST /api/reservations/verify-qr

Allowed:
- Grid Operator


### Complete Transaction
Purpose:
Mark a verified reservation as completed.
Record the completion time and the operator responsible.
Reject a second completion of the same reservation.
Coordinate capacity with Member 3 according to the agreed model.

Endpoint:
PATCH /api/reservations/{id}/complete

Allowed:
- Grid Operator


## Validation Requirements

- A prosumer must not read or update another prosumer's booking.
- Only a pending reservation can be approved or rejected.
- QR data is issued only for an approved reservation.
- Invalid QR codes are rejected.
- Cancelled, rejected, and completed reservations cannot be completed.
- Completion is stored once, with operator id and completion time.
- List endpoints must support filters and pagination.
- Dashboard counts must refresh from the shared reservation collection.
