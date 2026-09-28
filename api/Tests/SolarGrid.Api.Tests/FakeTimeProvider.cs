namespace SolarGrid.Api.Tests;

/// <summary>
/// Controllable clock for expiry tests.
/// </summary>
public sealed class FakeTimeProvider : TimeProvider
{
    public FakeTimeProvider(DateTimeOffset now)
    {
        Now = now;
    }

    public DateTimeOffset Now { get; set; }

    public override DateTimeOffset GetUtcNow() => Now;

    public void Advance(TimeSpan by) => Now = Now.Add(by);
}
