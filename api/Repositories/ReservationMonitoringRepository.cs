using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using SolarGrid.Api.Data;
using SolarGrid.Api.Models;

namespace SolarGrid.Api.Repositories;

/// <summary>
/// Search filters for reservation lists. Null means "do not filter".
/// </summary>
public class ReservationSearchCriteria
{
    public string? ProsumerId { get; set; }
    public ReservationStatus? Status { get; set; }
    public string? StationId { get; set; }
    public string? ReservationId { get; set; }

    /// <summary>
    /// Only reservations whose slot starts on this UTC date.
    /// </summary>
    public DateTime? SlotDateUtc { get; set; }

    /// <summary>
    /// Matches station name (case-insensitive) or an exact reservation id.
    /// </summary>
    public string? Text { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Member 4 reads and status changes on the shared EnergyReservations collection.
/// Capacity changes reuse Member 3's ReservationRepository.
/// </summary>
public class ReservationMonitoringRepository
{
    private const int MaxStationNameMatches = 200;

    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<SolarStation> _stations;

    public ReservationMonitoringRepository(MongoDbContext context)
    {
        _reservations = context.Database.GetCollection<EnergyReservation>("EnergyReservations");
        _slots = context.Database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _stations = context.Database.GetCollection<SolarStation>("SolarStationInfo");
    }

    /// <summary>
    /// Creates list and summary indexes. Safe to call on every startup.
    /// </summary>
    public Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        var keys = Builders<EnergyReservation>.IndexKeys;

        return _reservations.Indexes.CreateManyAsync(
            new[]
            {
                new CreateIndexModel<EnergyReservation>(
                    keys.Ascending(r => r.ProsumerId).Ascending(r => r.Status),
                    new CreateIndexOptions { Name = "ProsumerId_Status" }),
                new CreateIndexModel<EnergyReservation>(
                    keys.Ascending(r => r.StationId).Ascending(r => r.Status),
                    new CreateIndexOptions { Name = "StationId_Status" }),
                new CreateIndexModel<EnergyReservation>(
                    keys.Ascending(r => r.SlotId),
                    new CreateIndexOptions { Name = "SlotId" })
            },
            cancellationToken);
    }

    /// <summary>
    /// Atomic status change. Succeeds only if Id, Status and Version all still
    /// match, so two simultaneous requests cannot both succeed.
    /// Returns null when the reservation was changed by another request.
    /// </summary>
    public async Task<EnergyReservation?> TryChangeStatusAsync(
        string reservationId,
        ReservationStatus fromStatus,
        long expectedVersion,
        ReservationStatus toStatus,
        DateTime nowUtc,
        string? operatorId,
        IClientSessionHandle session)
    {
        var filter = Builders<EnergyReservation>.Filter.And(
            Builders<EnergyReservation>.Filter.Eq(r => r.Id, reservationId),
            Builders<EnergyReservation>.Filter.Eq(r => r.Status, fromStatus),
            Builders<EnergyReservation>.Filter.Eq(r => r.Version, expectedVersion));

        var set = Builders<EnergyReservation>.Update;
        var updates = new List<UpdateDefinition<EnergyReservation>>
        {
            set.Set(r => r.Status, toStatus),
            set.Set(r => r.UpdatedAtUtc, nowUtc),
            set.Inc(r => r.Version, 1)
        };

        switch (toStatus)
        {
            case ReservationStatus.Approved:
                updates.Add(set.Set(r => r.ApprovedAtUtc, nowUtc));
                break;
            case ReservationStatus.Rejected:
                updates.Add(set.Set(r => r.RejectedAtUtc, nowUtc));
                break;
            case ReservationStatus.Completed:
                updates.Add(set.Set(r => r.CompletedAtUtc, nowUtc));
                updates.Add(set.Set(r => r.CompletedByOperatorId, operatorId));
                break;
            default:
                throw new ArgumentOutOfRangeException(
                    nameof(toStatus),
                    "Member 4 only sets Approved, Rejected or Completed.");
        }

        return await _reservations.FindOneAndUpdateAsync(
            session,
            filter,
            set.Combine(updates),
            new FindOneAndUpdateOptions<EnergyReservation>
            {
                ReturnDocument = ReturnDocument.After
            });
    }

    public Task<long> CountByStatusAsync(ReservationStatus status, string? prosumerId)
    {
        return _reservations.CountDocumentsAsync(StatusFilter(status, prosumerId));
    }

    /// <summary>
    /// Counts Approved reservations whose slot starts after nowUtc.
    /// </summary>
    public async Task<long> CountApprovedFutureAsync(DateTime nowUtc, string? prosumerId)
    {
        var result = await _reservations
            .Aggregate()
            .Match(StatusFilter(ReservationStatus.Approved, prosumerId))
            .Lookup("EnergyBookingSlots", "SlotId", "_id", "slot")
            .Match(new BsonDocument(
                "slot.StartTimeUtc",
                new BsonDocument("$gt", nowUtc)))
            .Count()
            .FirstOrDefaultAsync();

        return result?.Count ?? 0;
    }

    public async Task<(List<EnergyReservation> Items, long TotalCount)> SearchAsync(
        ReservationSearchCriteria criteria)
    {
        var filter = await BuildSearchFilterAsync(criteria);

        var totalCount = await _reservations.CountDocumentsAsync(filter);
        if (totalCount == 0)
        {
            return (new List<EnergyReservation>(), 0);
        }

        var items = await _reservations
            .Find(filter)
            .Sort(Builders<EnergyReservation>.Sort
                .Descending(r => r.CreatedAtUtc)
                .Descending(r => r.Id))
            .Skip((criteria.Page - 1) * criteria.PageSize)
            .Limit(criteria.PageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<Dictionary<string, EnergyBookingSlot>> GetSlotsByIdsAsync(
        IEnumerable<string> slotIds)
    {
        var ids = slotIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<string, EnergyBookingSlot>();
        }

        var slots = await _slots
            .Find(Builders<EnergyBookingSlot>.Filter.In(s => s.Id, ids))
            .ToListAsync();

        return slots.ToDictionary(s => s.Id);
    }

    public async Task<Dictionary<string, SolarStation>> GetStationsByIdsAsync(
        IEnumerable<string> stationIds)
    {
        var ids = stationIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<string, SolarStation>();
        }

        var stations = await _stations
            .Find(Builders<SolarStation>.Filter.In(s => s.Id, ids))
            .ToListAsync();

        return stations.ToDictionary(s => s.Id);
    }

    private async Task<FilterDefinition<EnergyReservation>> BuildSearchFilterAsync(
        ReservationSearchCriteria criteria)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filters = new List<FilterDefinition<EnergyReservation>>();

        if (!string.IsNullOrWhiteSpace(criteria.ProsumerId))
        {
            filters.Add(f.Eq(r => r.ProsumerId, criteria.ProsumerId));
        }

        if (criteria.Status.HasValue)
        {
            filters.Add(f.Eq(r => r.Status, criteria.Status.Value));
        }

        if (!string.IsNullOrWhiteSpace(criteria.StationId))
        {
            filters.Add(f.Eq(r => r.StationId, criteria.StationId));
        }

        if (!string.IsNullOrWhiteSpace(criteria.ReservationId))
        {
            filters.Add(f.Eq(r => r.Id, criteria.ReservationId));
        }

        if (criteria.SlotDateUtc.HasValue)
        {
            var slotIds = await GetSlotIdsStartingOnAsync(criteria.SlotDateUtc.Value);
            filters.Add(f.In(r => r.SlotId, slotIds));
        }

        if (!string.IsNullOrWhiteSpace(criteria.Text))
        {
            filters.Add(await BuildTextFilterAsync(criteria.Text.Trim()));
        }

        return filters.Count == 0 ? f.Empty : f.And(filters);
    }

    private async Task<FilterDefinition<EnergyReservation>> BuildTextFilterAsync(string text)
    {
        var f = Builders<EnergyReservation>.Filter;

        var stationIds = await _stations
            .Find(Builders<SolarStation>.Filter.Regex(
                s => s.Name,
                new BsonRegularExpression(Regex.Escape(text), "i")))
            .Limit(MaxStationNameMatches)
            .Project(s => s.Id)
            .ToListAsync();

        var matches = new List<FilterDefinition<EnergyReservation>>
        {
            f.In(r => r.StationId, stationIds)
        };

        // A full reservation id is also accepted as the booking reference.
        if (ObjectId.TryParse(text, out _))
        {
            matches.Add(f.Eq(r => r.Id, text));
        }

        return f.Or(matches);
    }

    private Task<List<string>> GetSlotIdsStartingOnAsync(DateTime dateUtc)
    {
        var dayStart = DateTime.SpecifyKind(dateUtc.Date, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);

        return _slots
            .Find(Builders<EnergyBookingSlot>.Filter.And(
                Builders<EnergyBookingSlot>.Filter.Gte(s => s.StartTimeUtc, dayStart),
                Builders<EnergyBookingSlot>.Filter.Lt(s => s.StartTimeUtc, dayEnd)))
            .Project(s => s.Id)
            .ToListAsync();
    }

    private static FilterDefinition<EnergyReservation> StatusFilter(
        ReservationStatus status,
        string? prosumerId)
    {
        var f = Builders<EnergyReservation>.Filter;
        var filter = f.Eq(r => r.Status, status);

        return string.IsNullOrWhiteSpace(prosumerId)
            ? filter
            : f.And(f.Eq(r => r.ProsumerId, prosumerId), filter);
    }
}
