# Member 2 - API Design

## Station Management

### Create Station
Purpose:
Create a new solar station with location and capacity details.

Endpoint:
POST /api/stations

Allowed roles:
- Backoffice
- Grid Operator


### Get Stations
Purpose:
Retrieve all active solar stations.

Endpoint:
GET /api/stations

Allowed:
- Backoffice
- Grid Operator
- Prosumer


### Get Station
Purpose:
Retrieve one solar station by ID.

Endpoint:
GET /api/stations/{id}

Allowed:
- Backoffice
- Grid Operator
- Prosumer


### Update Station
Purpose:
Update permitted station information such as name,
address, location, capacity and battery storage slots.

Endpoint:
PUT /api/stations/{id}

Allowed roles:
- Backoffice
- Grid Operator


### Deactivate Station
Purpose:
Deactivate a station when no active reservations exist.

Endpoint:
PATCH /api/stations/{id}/deactivate

Allowed roles:
- Backoffice
- Grid Operator


### Get Nearby Stations
Purpose:
Find active stations within a radius of a given location.

Endpoint:
GET /api/stations/nearby?latitude={lat}&longitude={lng}&radiusKm={km}

Allowed:
- Backoffice
- Grid Operator
- Prosumer


## Schedule Management

### Get Schedules
Purpose:
Retrieve weekly operating schedules for a station.

Endpoint:
GET /api/stations/{id}/schedules

Allowed:
- Backoffice
- Grid Operator
- Prosumer


### Create Schedule
Purpose:
Create an opening and closing schedule entry for one day.

Endpoint:
POST /api/stations/{id}/schedules

Allowed roles:
- Backoffice
- Grid Operator


### Update Schedule
Purpose:
Update an existing schedule entry for a station.

Endpoint:
PUT /api/stations/{id}/schedules/{scheduleId}

Allowed roles:
- Backoffice
- Grid Operator


## Booking Slot Management

### Create Slot
Purpose:
Create an energy booking slot for a station.

Endpoint:
POST /api/booking-slots/station/{stationId}

Allowed roles:
- Backoffice
- Grid Operator


### Get Slot
Purpose:
Retrieve one booking slot by ID.

Endpoint:
GET /api/booking-slots/{id}

Allowed:
- Backoffice
- Grid Operator
- Prosumer


### Get Available Slots
Purpose:
Retrieve available booking slots for a station on a UTC date.
A slot is available when it is active and still has
remaining booking capacity.

Endpoint:
GET /api/stations/{id}/slots?dateUtc={date}

Allowed:
- Backoffice
- Grid Operator
- Prosumer


## Validation Requirements

- Latitude and longitude must be validated on create and update.
- Capacity must be greater than zero.
- Booking limits must be greater than zero.
- Slot end time must be after start time.
- Schedule closing time must be after opening time.
- Deactivation must be rejected when reserved bookings exist.
- Invalid or missing station IDs must return not found.
