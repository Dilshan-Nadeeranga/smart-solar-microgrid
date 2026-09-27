# Member 2 - Collection Design

## SolarStationInfo

### Purpose

Stores solar station master data used by the web and Android clients
for listing, nearby search and reservation planning.

### Fields

Id
Name
Address
Latitude
Longitude
CapacityKw
BatteryStorageSlots
IsActive
CreatedAtUtc
UpdatedAtUtc


## StationSchedules

### Purpose

Stores weekly operating hours for each station.

### Fields

Id
StationId
Day
OpeningTime
ClosingTime
IsAvailable


## EnergyBookingSlots

### Purpose

Stores bookable energy time windows for a station.
ReservedBookings is increased by later reservation workflows.

### Fields

Id
StationId
StartTimeUtc
EndTimeUtc
MaximumBookings
ReservedBookings
IsActive

### Derived Value

RemainingBookings = MaximumBookings - ReservedBookings
