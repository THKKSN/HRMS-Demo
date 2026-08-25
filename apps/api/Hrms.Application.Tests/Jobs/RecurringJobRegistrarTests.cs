using FluentAssertions;
using Hangfire;
using Hrms.Infrastructure.Jobs;
using Moq;

namespace Hrms.Application.Tests.Jobs;

public class RecurringJobRegistrarTests
{
    [Fact]
    public void RegisterProductionJobs_ShouldRegisterAllJobsThroughInjectedManager()
    {
        var manager = new Mock<IRecurringJobManager>();
        var registrar = new RecurringJobRegistrar(manager.Object);

        registrar.RegisterProductionJobs();

        var jobIds = manager.Invocations
            .Select(invocation => invocation.Arguments[0])
            .Cast<string>();

        jobIds.Should().BeEquivalentTo(
        [
            "ticket-upload-cleanup",
            "notification-outbox-delivery",
            "external-repair-sync-delivery",
            "expense-ocr-stale-recovery",
            "ticket-auto-requester-confirmation"
        ]);
    }

    [Fact]
    public void RegisterDevelopmentJobs_ShouldRegisterDailyAttendanceReportThroughInjectedManager()
    {
        var manager = new Mock<IRecurringJobManager>();
        var registrar = new RecurringJobRegistrar(manager.Object);

        registrar.RegisterDevelopmentJobs();

        manager.Invocations
            .Select(invocation => invocation.Arguments[0])
            .Should()
            .ContainSingle()
            .Which
            .Should()
            .Be("daily-attendance-report");
    }
}
