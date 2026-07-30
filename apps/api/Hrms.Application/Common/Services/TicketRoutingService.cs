using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Services;

public class TicketRoutingService(IApplicationDbContext db) : ITicketRoutingService
{
    public async Task<TicketRoutingResult> ResolveAsync(
        Guid companyId, Guid departmentId, Guid categoryId, Guid topicId,
        DateOnly at, CancellationToken ct = default)
    {
        var topic = await db.TicketTopics.AsNoTracking()
            .Where(t => t.Id == topicId && t.CategoryId == categoryId &&
                        t.CompanyId == companyId && t.DepartmentId == departmentId && t.IsActive)
            .Select(t => new { t.RoutingMode })
            .FirstOrDefaultAsync(ct);
        if (topic is null)
            return Empty();

        var topicCandidates = await EligibleQuery(companyId, departmentId, categoryId, topicId, at)
            .Select(r => new TicketRoutingCandidate(
                r.Id, r.EmployeeId,
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.Employee.LineUserId))
            .ToListAsync(ct);
        if (topicCandidates.Count > 0)
            return Result(TicketRoutingLevel.Topic, topic.RoutingMode, topicCandidates);

        var category = await db.TicketCategories.AsNoTracking()
            .Where(c => c.Id == categoryId && c.CompanyId == companyId &&
                        c.DepartmentId == departmentId && c.IsActive)
            .Select(c => new { c.RoutingMode })
            .FirstOrDefaultAsync(ct);
        if (category is null)
            return Empty();

        var categoryCandidates = await EligibleQuery(companyId, departmentId, categoryId, null, at)
            .Select(r => new TicketRoutingCandidate(
                r.Id, r.EmployeeId,
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.Employee.LineUserId))
            .ToListAsync(ct);
        return categoryCandidates.Count == 0
            ? Empty()
            : Result(TicketRoutingLevel.Category, category.RoutingMode, categoryCandidates);
    }

    private IQueryable<Domain.Entities.EmployeeResponsibility> EligibleQuery(
        Guid companyId, Guid departmentId, Guid categoryId, Guid? topicId, DateOnly at)
        => db.EmployeeResponsibilities.AsNoTracking().Where(r =>
            r.CompanyId == companyId && r.DepartmentId == departmentId &&
            r.CategoryId == categoryId && r.TopicId == topicId && r.IsActive &&
            (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= at) &&
            (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= at) &&
            r.Employee.IsActive && r.Employee.CompanyId == companyId &&
            r.Employee.DepartmentId == departmentId);

    private static TicketRoutingResult Result(
        TicketRoutingLevel level, TicketRoutingMode mode, IReadOnlyList<TicketRoutingCandidate> candidates)
        => new(level, mode,
            mode == TicketRoutingMode.AutoAssignSingle && candidates.Count == 1
                ? TicketRoutingOutcome.AutoAssigned
                : TicketRoutingOutcome.SupervisorQueue,
            candidates);

    private static TicketRoutingResult Empty()
        => new(TicketRoutingLevel.None, TicketRoutingMode.SupervisorAssign,
            TicketRoutingOutcome.NoMatch, []);
}
