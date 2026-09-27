# Member 3 - Test Cases

## Setup

1. Log in through `POST /api/auth/login` and copy the token.
2. In Swagger, click Authorize and paste the token.
3. Prepare test data in MongoDB:
   - An ACTIVE prosumer and a second ACTIVE prosumer
   - An active station
   - Active slots starting within seven days
   - One slot with MaximumBookings = 1
   - One slot starting in more than seven days
   - One slot starting in less than 12 hours

## Booking Creation

| # | Test | Expected result |
|---|------|-----------------|
| 1 | Book a valid slot within seven days | 201, status Pending, ReservedBookings +1 |
| 2 | Book a slot that has already started | 400 |
| 3 | Book a slot more than seven days ahead | 400 |
| 4 | Book a slot on an inactive station | 400 |
| 5 | Book an inactive slot | 400 |
| 6 | Book a slot outside the station schedule | 400 |
| 7 | Book a full slot | 409 |
| 8 | Book the same slot twice as the same prosumer | 409 |
| 9 | Book a slot overlapping an existing active booking | 409 |
| 10 | Book a back-to-back slot | 201 |
| 11 | Send a stationId that does not match the slot | 400 |
| 12 | Send a slotId that does not exist | 404 |
| 13 | Prosumer sends another prosumer's NIC as prosumerId | 403 |
| 14 | Staff books without prosumerId | 400 |
| 15 | Staff books for an inactive prosumer | 403 |
| 16 | Request without a token | 401 |

## Get Details

| # | Test | Expected result |
|---|------|-----------------|
| 17 | Prosumer gets their own reservation | 200 |
| 18 | Prosumer gets another prosumer's reservation | 403 |
| 19 | Staff gets any reservation | 200 |
| 20 | Get a reservation that does not exist | 404 |

## Update

| # | Test | Expected result |
|---|------|-----------------|
| 21 | Change to a valid slot with more than 12 hours remaining | 200, old slot -1, new slot +1 |
| 22 | Change with exactly 12 hours remaining | 200 |
| 23 | Change with less than 12 hours remaining | 400 |
| 24 | Change to a full slot | 409, original booking and capacity unchanged |
| 25 | Change a Cancelled, Rejected or Completed reservation | 400 |
| 26 | Change an Approved reservation | 200, status back to Pending |
| 27 | Change to a slot more than seven days ahead | 400 |
| 28 | Change using an old version number | 409 |
| 29 | Prosumer changes another user's booking | 403 |

## Cancellation

| # | Test | Expected result |
|---|------|-----------------|
| 30 | Cancel with more than 12 hours remaining | 200, status Cancelled, ReservedBookings -1 |
| 31 | Cancel with exactly 12 hours remaining | 200 |
| 32 | Cancel with less than 12 hours remaining | 400 |
| 33 | Cancel the same reservation twice | Second request 409, capacity released only once |
| 34 | Prosumer cancels another user's booking | 403 |
| 35 | Cancelled record still exists in the database | Record kept with CancelledAtUtc set |

## Concurrency and Integrity

| # | Test | Expected result |
|---|------|-----------------|
| 36 | Two users request the final space at the same time | Only one succeeds, the other gets 409 |
| 37 | Two cancel requests for the same reservation at the same time | Only one succeeds, capacity released once |
| 38 | Client sends forged status "Approved" | Ignored, reservation saved as Pending |
| 39 | Client sends forged reservedBookings value | Ignored |
| 40 | Database operation fails during booking | No partial capacity or reservation change |

## Testing Twelve-Hour and Seven-Day Boundaries

Create slots with start times relative to the current UTC time:

| Slot start | Use for |
|------------|---------|
| now + 12 hours + 2 minutes | Exactly-12-hours tests (run quickly) |
| now + 11 hours | Less-than-12-hours tests |
| now + 6 days | Valid booking |
| now + 8 days | Beyond-seven-days test |
| now - 1 hour | Past slot test |

## Concurrent Request Test (PowerShell)

Run with a slot that has one space left, using two different
prosumer tokens:

```powershell
$body = '{ "slotId": "<slot id>" }'
$url = "http://localhost:5257/api/reservations"

$jobs = @($tokenA, $tokenB) | ForEach-Object {
    $token = $_
    Start-Job -ScriptBlock {
        param($url, $body, $token)
        try {
            Invoke-RestMethod -Uri $url -Method Post -Body $body `
                -ContentType "application/json" `
                -Headers @{ Authorization = "Bearer $token" }
            "Success"
        } catch {
            $_.Exception.Response.StatusCode.value__
        }
    } -ArgumentList $url, $body, $token
}

$jobs | Wait-Job | Receive-Job
```

Expected output: one `Success` and one `409`.
