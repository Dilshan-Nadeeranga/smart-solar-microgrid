using SolarGrid.Api.Models;
using SolarGrid.Api.Services;

namespace SolarGrid.Api.Tests;

public class ReservationStatusRulesTests
{
    // ----- Allowed and blocked transitions -----

    [Theory]
    [InlineData(ReservationStatus.Pending, ReservationAction.Approve, true)]
    [InlineData(ReservationStatus.Approved, ReservationAction.Approve, false)]
    [InlineData(ReservationStatus.Cancelled, ReservationAction.Approve, false)]
    [InlineData(ReservationStatus.Rejected, ReservationAction.Approve, false)]
    [InlineData(ReservationStatus.Completed, ReservationAction.Approve, false)]
    [InlineData(ReservationStatus.Pending, ReservationAction.Reject, true)]
    [InlineData(ReservationStatus.Approved, ReservationAction.Reject, false)]
    [InlineData(ReservationStatus.Cancelled, ReservationAction.Reject, false)]
    [InlineData(ReservationStatus.Rejected, ReservationAction.Reject, false)]
    [InlineData(ReservationStatus.Completed, ReservationAction.Reject, false)]
    [InlineData(ReservationStatus.Pending, ReservationAction.Complete, false)]
    [InlineData(ReservationStatus.Approved, ReservationAction.Complete, true)]
    [InlineData(ReservationStatus.Cancelled, ReservationAction.Complete, false)]
    [InlineData(ReservationStatus.Rejected, ReservationAction.Complete, false)]
    [InlineData(ReservationStatus.Completed, ReservationAction.Complete, false)]
    public void CanTransition_matches_lifecycle(
        ReservationStatus current,
        ReservationAction action,
        bool expected)
    {
        Assert.Equal(expected, ReservationStatusRules.CanTransition(current, action));
    }

    [Theory]
    [InlineData(ReservationAction.Approve, ReservationStatus.Approved)]
    [InlineData(ReservationAction.Reject, ReservationStatus.Rejected)]
    [InlineData(ReservationAction.Complete, ReservationStatus.Completed)]
    public void TargetStatus_is_correct(ReservationAction action, ReservationStatus expected)
    {
        Assert.Equal(expected, ReservationStatusRules.TargetStatus(action));
    }

    [Fact]
    public void Every_status_and_action_pair_has_a_rule_and_message()
    {
        // Guards against a new enum value being added without updating the rules.
        foreach (var status in Enum.GetValues<ReservationStatus>())
        {
            foreach (var action in Enum.GetValues<ReservationAction>())
            {
                var allowed = ReservationStatusRules.CanTransition(status, action);
                var message = ReservationStatusRules.BlockedMessage(status, action);

                Assert.False(string.IsNullOrWhiteSpace(message));
                Assert.Equal(status == ReservationStatusRules.RequiredStatus(action), allowed);
            }
        }
    }

    // ----- Capacity -----

    [Theory]
    [InlineData(ReservationStatus.Pending, true)]
    [InlineData(ReservationStatus.Approved, true)]
    [InlineData(ReservationStatus.Cancelled, false)]
    [InlineData(ReservationStatus.Rejected, false)]
    [InlineData(ReservationStatus.Completed, false)]
    public void Only_pending_and_approved_consume_capacity(ReservationStatus status, bool expected)
    {
        Assert.Equal(expected, ReservationStatusRules.ConsumesCapacity(status));
    }

    [Fact]
    public void Approve_keeps_capacity()
    {
        Assert.False(ReservationStatusRules.ReleasesCapacity(ReservationAction.Approve));
    }

    [Fact]
    public void Reject_releases_capacity()
    {
        Assert.True(ReservationStatusRules.ReleasesCapacity(ReservationAction.Reject));
    }

    [Fact]
    public void Complete_releases_capacity()
    {
        Assert.True(ReservationStatusRules.ReleasesCapacity(ReservationAction.Complete));
    }

    [Fact]
    public void Capacity_is_released_exactly_once_on_every_path()
    {
        // Walk every legal Member 4 path from Pending and count capacity releases.
        var paths = new[]
        {
            new[] { ReservationAction.Reject },
            new[] { ReservationAction.Approve, ReservationAction.Complete }
        };

        foreach (var path in paths)
        {
            var status = ReservationStatus.Pending;
            var releases = 0;

            foreach (var action in path)
            {
                Assert.True(ReservationStatusRules.CanTransition(status, action));
                if (ReservationStatusRules.ReleasesCapacity(action))
                {
                    releases++;
                }

                status = ReservationStatusRules.TargetStatus(action);
            }

            Assert.Equal(1, releases);
            Assert.False(ReservationStatusRules.ConsumesCapacity(status));

            // A final state accepts no further Member 4 action, so a second
            // reject or complete can never release capacity again.
            foreach (var action in Enum.GetValues<ReservationAction>())
            {
                Assert.False(ReservationStatusRules.CanTransition(status, action));
            }
        }
    }

    // ----- QR and messages -----

    [Theory]
    [InlineData(ReservationStatus.Pending, false)]
    [InlineData(ReservationStatus.Approved, true)]
    [InlineData(ReservationStatus.Cancelled, false)]
    [InlineData(ReservationStatus.Rejected, false)]
    [InlineData(ReservationStatus.Completed, false)]
    public void Qr_is_issued_only_for_approved(ReservationStatus status, bool expected)
    {
        Assert.Equal(expected, ReservationStatusRules.CanIssueQr(status));
    }

    [Fact]
    public void Double_complete_message_says_capacity_was_not_released_again()
    {
        var message = ReservationStatusRules.BlockedMessage(
            ReservationStatus.Completed,
            ReservationAction.Complete);

        Assert.Contains("already completed", message);
        Assert.Contains("not released again", message);
    }

    [Theory]
    [InlineData(ReservationStatus.Cancelled, "cancelled")]
    [InlineData(ReservationStatus.Rejected, "rejected")]
    public void Complete_blocked_message_names_the_status(ReservationStatus status, string word)
    {
        Assert.Contains(word, ReservationStatusRules.BlockedMessage(status, ReservationAction.Complete));
    }

    [Fact]
    public void Approve_blocked_message_names_current_status()
    {
        var message = ReservationStatusRules.BlockedMessage(
            ReservationStatus.Cancelled,
            ReservationAction.Approve);

        Assert.Contains("Only a pending reservation can be approved", message);
        Assert.Contains("Cancelled", message);
    }
}
