# Member 4 - Booking Monitoring and QR Verification

## User Stories

As a prosumer, I want to track my reservations and display a QR code
for an approved booking, so that I can complete my energy transaction.

As a Grid Operator, I want to monitor bookings and verify transaction QR codes,
so that I can confirm reservations and record completed energy transfers.

## Main Responsibilities

Member 4 monitors reservations created by Member 3.
It does not create a second booking collection.

### Prosumer
- View own booking dashboard
- View pending and approved future reservation counts
- View current and pending bookings
- View booking and completed-transfer history
- Search and filter own bookings
- Open Member 3 reservation details from a booking
- Display a secure QR code for an approved reservation

### Grid Operator
- View the operational booking dashboard
- View pending reservations and approved future counts
- Search and filter reservations
- View booking and completed-transfer history
- Scan a transaction QR code in the Android app
- See server-verified reservation details
- Mark a verified energy transfer as completed

### Authorized staff
- Approve or reject a pending reservation

The manual approval step is a proposed design.
Confirm who approves reservations with the lecturer,
because the brief does not clearly assign that role.

## Story Flow

1. The prosumer creates a reservation through Member 3.
2. The reservation appears in the prosumer pending list
   and the staff pending-reservation list.
3. An authorized staff member approves or rejects it.
4. The prosumer sees the updated status.
5. An approved reservation can display a secure QR code.
6. The dashboard shows pending reservations and the count
   of approved future reservations.
7. At the scheduled time, the prosumer presents the QR code.
8. The Grid Operator logs in and scans the QR code.
9. The API checks the QR code, operator permission,
   and reservation status.
10. A valid scan shows the reservation details.
11. After the energy transfer, the operator marks it completed.
12. The API records completion and blocks a second completion.
13. The prosumer can see the completed transfer in history
    and can search or filter bookings.

## Reservation Statuses

1. Pending
2. Approved
3. Rejected
4. Cancelled
5. Completed

## Status Lifecycle

Member 3 creates reservation
        |
        v
     Pending
        |
   +----+----+
   |         |
Approved   Rejected
   |
   v
QR verified by Grid Operator
   |
   v
 Completed

Cancelled stays owned by Member 3.
Rejected and Completed reservations cannot be completed again.

## QR Rules

- The QR payload is issued by the API for an approved reservation.
- The payload is signed by the server.
- A scan is accepted only after the API verifies the signature,
  the operator role, and the reservation status.
- Invalid, cancelled, rejected, and already completed scans
  return a clear error.
- Completion stores the time and the operator who completed it.

## Capacity Coordination

When a reservation is rejected or completed, Member 4 asks Member 3
to release or keep slot capacity according to the agreed capacity model.
Member 4 does not invent a separate capacity store.

## Client Architecture

Web -> C# API -> MongoDB EnergyReservations

Android -> C# API -> MongoDB EnergyReservations

## Web Tasks

- Operational booking dashboard
- Pending reservation list
- Approved future reservation count
- Reservation list with status
- Search and filter by date, station, reference, or status
- Booking and completed-transfer history
- Approve or reject a pending reservation
- Open Member 3 details, edit, and cancellation screens
- Refresh lists and counts after a change

## Android Tasks

- Prosumer booking dashboard
- Pending and approved future counts
- Current and pending bookings
- Booking and completed-transfer history
- Search and filter the signed-in prosumer's bookings
- Open Member 3 reservation details
- QR display for an approved reservation
- QR scanner for a Grid Operator
- Server-verified details after a scan
- Mark the energy transfer as completed
- Clear messages for invalid, cancelled, or already completed scans
