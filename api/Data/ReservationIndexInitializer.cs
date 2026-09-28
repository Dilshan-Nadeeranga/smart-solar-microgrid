using SolarGrid.Api.Repositories;

namespace SolarGrid.Api.Data;

/// <summary>
/// Creates Member 4 indexes in the background at startup.
/// A database problem is logged and never stops the API from starting.
/// </summary>
public class ReservationIndexInitializer : BackgroundService
{
    private readonly ReservationMonitoringRepository _repository;
    private readonly ILogger<ReservationIndexInitializer> _logger;

    public ReservationIndexInitializer(
        ReservationMonitoringRepository repository,
        ILogger<ReservationIndexInitializer> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await _repository.EnsureIndexesAsync(stoppingToken);
            _logger.LogInformation("EnergyReservations indexes are ready.");
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down.
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not create EnergyReservations indexes. Queries still work without them.");
        }
    }
}
