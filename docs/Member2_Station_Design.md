# Member 2 - Station Management System

## Main Responsibilities

Member 2 owns solar station information, weekly schedules,
and energy booking slots used by later reservation workflows.

### Backoffice / Grid Operator
- Create stations
- Update station details
- View station list and details
- Deactivate stations
- Create and update station schedules
- Create booking slots

### Prosumer
- View active stations
- Search nearby stations
- View available slots for a date
- View station schedules

## Core Entities

1. Solar Station
2. Station Schedule
3. Energy Booking Slot

## Station Lifecycle

Create station
        |
        v
     Active
        |
        v
Update details / schedules / slots
        |
        v
Deactivation request
        |
        v
Check active reservations
        |
   +----+----+
   |         |
Blocked   Deactivated
(if reserved
 bookings exist)

## Validation Rules

- Station name is required.
- Latitude must be between -90 and 90.
- Longitude must be between -180 and 180.
- Capacity must be greater than zero.
- Slot end time must be after start time.
- Maximum bookings must be greater than zero.
- Schedule closing time must be after opening time.

## Nearby Search

Nearby search calculates the distance between the
prosumer location and each active station.
Only stations inside the requested radius are returned,
ordered by distance.

## Deactivation Rule

A station cannot be deactivated while any of its
active booking slots still have reserved bookings.
This protects ongoing reservation work owned by later members.

## Client Architecture

Web -> C# API -> MongoDB

Android -> C# API -> MongoDB

## MongoDB Collections

- SolarStationInfo
- StationSchedules
- EnergyBookingSlots
