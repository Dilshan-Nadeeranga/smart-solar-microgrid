# Member 3 - API Design

## Authentication

All reservation endpoints require a valid JWT from Member 1's login.

```
Authorization: Bearer {token}
```

The API reads the user's NIC and role from the token.
Clients cannot choose their own identity.

## Permissions

| Role | Access |
|------|--------|
| PROSUMER | Only their own reservations |
| GRID_OPERATOR | Any reservation, on behalf of a prosumer |
| BACKOFFICE | Any reservation, on behalf of a prosumer |

The API checks permissions itself on every request.


## Create Reservation

```
POST /api/reservations
```

Purpose:
Create a booking for an energy slot.

Allowed:
- Prosumer, for themselves
- Grid Operator and Backoffice, on behalf of a prosumer

Request body:

```json
{
  "slotId": "665f1c2e8a1b2c3d4e5f6a7b",
  "stationId": "665f1b9a8a1b2c3d4e5f6a70",
  "prosumerId": "200012345678"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| slotId | Yes | Selected energy slot |
| stationId | No | If sent, must match the slot's station |
| prosumerId | Staff only | Prosumers must omit it or send their own NIC |

Checks:
1. User is authenticated and permitted.
2. Prosumer is determined (from the token for prosumers).
3. Prosumer account is ACTIVE.
4. Slot and station exist and are active.
5. Slot belongs to the station.
6. Slot is within the station operating schedule.
7. Slot starts within the next seven days.
8. No duplicate or overlapping active booking.
9. Capacity is reserved and reservation is saved together.

Success: `201 Created`


## Get Reservation

```
GET /api/reservations/{id}
```

Purpose:
Retrieve booking details for the summary or edit screen.

Allowed:
- The owning prosumer
- Grid Operator and Backoffice

Success: `200 OK`


## Update Reservation

```
PUT /api/reservations/{id}
```

Purpose:
Move an eligible reservation to a different slot.

Allowed:
- The owning prosumer
- Grid Operator and Backoffice

Request body:

```json
{
  "slotId": "665f1c2e8a1b2c3d4e5f6a7c",
  "stationId": "665f1b9a8a1b2c3d4e5f6a70",
  "version": 1
}
```

| Field | Required | Notes |
|-------|----------|-------|
| slotId | Yes | New energy slot |
| stationId | No | If sent, must match the new slot's station |
| version | No | Send the version from GET to detect concurrent changes |

Checks:
1. Reservation exists and user owns it or is staff.
2. Status is Pending or Approved.
3. At least 12 hours remain before the existing booking starts.
4. New slot and station are active and match.
5. New slot is within schedule and within seven days.
6. No duplicate or overlap, excluding this reservation.
7. Old capacity released, new capacity reserved, reservation
   updated in one transaction.

The updated reservation returns to Pending.

Success: `200 OK`


## Cancel Reservation

```
PATCH /api/reservations/{id}/cancel
```

Purpose:
Cancel an eligible reservation and release its capacity.

Allowed:
- The owning prosumer
- Grid Operator and Backoffice

Request body (optional):

```json
{
  "version": 2
}
```

Checks:
1. Reservation exists and user owns it or is staff.
2. Status is Pending or Approved.
3. At least 12 hours remain before the booking starts.
4. Status set to Cancelled, cancellation time recorded and
   capacity released in one transaction.

A second cancel request is rejected and does not release capacity again.

Success: `200 OK`


## Response Format

All successful responses use the same summary shape:

```json
{
  "message": "Reservation created.",
  "reservationId": "6660a1f28a1b2c3d4e5f6b01",
  "reservation": {
    "id": "6660a1f28a1b2c3d4e5f6b01",
    "prosumerId": "200012345678",
    "stationId": "665f1b9a8a1b2c3d4e5f6a70",
    "slotId": "665f1c2e8a1b2c3d4e5f6a7b",
    "status": "Pending",
    "createdAtUtc": "2026-09-27T10:00:00Z",
    "updatedAtUtc": "2026-09-27T10:00:00Z",
    "cancelledAtUtc": null,
    "version": 1,
    "slotStartTimeUtc": "2026-09-30T08:00:00Z",
    "slotEndTimeUtc": "2026-09-30T09:00:00Z",
    "remainingBookings": 4
  }
}
```

Error responses:

```json
{
  "message": "This energy slot has no remaining capacity."
}
```


## HTTP Status Codes

| Situation | Status |
|-----------|--------|
| Reservation created | 201 Created |
| Details, update or cancellation successful | 200 OK |
| Invalid date, inactive station/slot, broken notice rule | 400 Bad Request |
| Not logged in | 401 Unauthorized |
| Not permitted, inactive prosumer account | 403 Forbidden |
| Reservation, slot, station or prosumer missing | 404 Not Found |
| Capacity, duplicate, overlap or concurrent-change conflict | 409 Conflict |


## Ignored Client Fields

Clients cannot set these values. They are ignored if sent:

- id
- status
- createdAtUtc, updatedAtUtc, cancelledAtUtc
- reservedBookings or any capacity value

Only `slotId`, `stationId`, `prosumerId` (staff) and `version`
are read from the request body.


## Security Requirements

- The API must authenticate users before every reservation operation.
- Prosumers must not access another prosumer's reservation.
- Prosumer identity comes from the token, not the request body.
- Forged status or capacity values must have no effect.
- Capacity must never be reserved or released without a matching
  reservation change.
