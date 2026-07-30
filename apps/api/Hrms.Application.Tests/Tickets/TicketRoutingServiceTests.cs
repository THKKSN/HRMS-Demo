using FluentAssertions;
using Hrms.Application.Common.Services;
using Hrms.Application.Tests.Support;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Tickets;

public class TicketRoutingServiceTests
{
    [Fact]
    public async Task Resolve_ShouldPreferTopicResponsibilityOverCategory()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        AddResponsibility(fixture, fixture.AssigneeId, fixture.TopicId);
        AddResponsibility(fixture, fixture.SupervisorId, null);
        await fixture.Db.SaveChangesAsync();

        var result = await Resolve(fixture);

        result.Level.Should().Be(TicketRoutingLevel.Topic);
        result.Candidates.Should().ContainSingle()
            .Which.EmployeeId.Should().Be(fixture.AssigneeId);
    }

    [Fact]
    public async Task Resolve_ShouldFallbackToCategoryWhenTopicHasNoCandidate()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync();
        AddResponsibility(fixture, fixture.SupervisorId, null);
        await fixture.Db.SaveChangesAsync();

        var result = await Resolve(fixture);

        result.Level.Should().Be(TicketRoutingLevel.Category);
        result.Candidates.Should().ContainSingle()
            .Which.EmployeeId.Should().Be(fixture.SupervisorId);
    }

    [Fact]
    public async Task Resolve_ShouldAutoAssignOnlySingleCandidateInAutoMode()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync(
            topicMode: TicketRoutingMode.AutoAssignSingle);
        AddResponsibility(fixture, fixture.AssigneeId, fixture.TopicId);
        await fixture.Db.SaveChangesAsync();

        var result = await Resolve(fixture);

        result.Outcome.Should().Be(TicketRoutingOutcome.AutoAssigned);
    }

    [Fact]
    public async Task Resolve_ShouldUseSupervisorQueueForMultipleCandidates()
    {
        await using var fixture = new TicketTestFixture();
        await fixture.SeedOrganizationAsync(
            topicMode: TicketRoutingMode.AutoAssignSingle);
        AddResponsibility(fixture, fixture.AssigneeId, fixture.TopicId);
        AddResponsibility(fixture, fixture.SupervisorId, fixture.TopicId);
        await fixture.Db.SaveChangesAsync();

        var result = await Resolve(fixture);

        result.Outcome.Should().Be(TicketRoutingOutcome.SupervisorQueue);
        result.Candidates.Should().HaveCount(2);
    }

    private static Task<Hrms.Application.Common.Interfaces.TicketRoutingResult> Resolve(
        TicketTestFixture fixture)
        => new TicketRoutingService(fixture.Db).ResolveAsync(
            fixture.CompanyId,
            fixture.TargetDepartmentId,
            fixture.CategoryId,
            fixture.TopicId,
            DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)));

    private static void AddResponsibility(
        TicketTestFixture fixture, Guid employeeId, Guid? topicId)
        => fixture.Db.EmployeeResponsibilities.Add(new EmployeeResponsibility
        {
            CompanyId = fixture.CompanyId,
            DepartmentId = fixture.TargetDepartmentId,
            CategoryId = fixture.CategoryId,
            TopicId = topicId,
            EmployeeId = employeeId,
            IsActive = true,
            CreatedByEmployeeId = fixture.SupervisorId
        });
}
