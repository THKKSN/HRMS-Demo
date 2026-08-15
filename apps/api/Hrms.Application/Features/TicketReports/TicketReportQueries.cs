using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Extensions;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.TicketReports;

public record GetTicketReportScopeQuery : IRequest<TicketReportScopeDto>;

public class GetTicketReportScopeHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketReportScopeQuery, TicketReportScopeDto>
{
    public async Task<TicketReportScopeDto> Handle(GetTicketReportScopeQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-report", ct);

        var departmentsQuery = db.Departments.AsNoTracking()
            .Where(department => department.IsActive && department.Company.IsActive);

        if (!currentUser.HasRole(RoleType.Admin))
        {
            if (currentUser.HasRole(RoleType.Supervisor) && currentUser.EmployeeId.HasValue)
            {
                var employeeId = currentUser.EmployeeId.Value;
                var ownDepartmentId = currentUser.DepartmentId;
                var roleDepartmentIds = currentUser.Roles
                    .Where(role => role.Role == RoleType.Supervisor.ToString() && role.DepartmentId.HasValue)
                    .Select(role => role.DepartmentId!.Value)
                    .ToList();

                departmentsQuery = departmentsQuery.Where(department =>
                    department.ManagerEmployeeId == employeeId ||
                    (ownDepartmentId.HasValue && department.Id == ownDepartmentId.Value) ||
                    roleDepartmentIds.Contains(department.Id) ||
                    db.EmployeeResponsibilities.Any(responsibility =>
                        responsibility.EmployeeId == employeeId &&
                        responsibility.IsActive &&
                        responsibility.CompanyId == department.CompanyId &&
                        responsibility.DepartmentId == department.Id));
            }
            else
            {
                var companyIds = currentUser.ManagedCompanyIds;
                departmentsQuery = departmentsQuery.Where(department => companyIds.Contains(department.CompanyId));
            }
        }

        var departments = await departmentsQuery
            .Select(department => new { department.Id, department.CompanyId, department.Name })
            .Distinct()
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var companyIdsInScope = departments.Select(department => department.CompanyId).Distinct().ToList();
        var companies = await db.Companies.AsNoTracking()
            .Where(company => companyIdsInScope.Contains(company.Id))
            .OrderBy(company => company.Name)
            .Select(company => new { company.Id, company.Name })
            .ToListAsync(ct);

        return new TicketReportScopeDto(
            companies.Select(x => new TicketReportScopeCompanyDto(x.Id, x.Name)).ToList(),
            departments.Select(x => new TicketReportScopeDepartmentDto(
                x.Id, x.CompanyId, x.Name)).ToList());
    }
}

public record GetTicketReportSummaryQuery(TicketReportFilter Filter) : IRequest<TicketReportSummaryDto>;

public class GetTicketReportSummaryHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketReportSummaryQuery, TicketReportSummaryDto>
{
    public async Task<TicketReportSummaryDto> Handle(GetTicketReportSummaryQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var filtered = TicketReportAccess.ApplyFilters(scoped, request.Filter);
        var tickets = await filtered
            .Include(t => t.Assignments)
            .Include(t => t.StatusHistory)
            .Include(t => t.Reviews)
            .ToListAsync(ct);

        var accept = tickets.Where(t => t.SupervisorAcceptedAt.HasValue)
            .Select(t => (t.SupervisorAcceptedAt!.Value - t.CreatedAt).TotalMinutes).Where(x => x >= 0).ToList();
        var assign = tickets.Select(t => t.Assignments.OrderBy(a => a.AssignedAt).FirstOrDefault())
            .Where(a => a is not null).Select(a => (a!.AssignedAt - a.Ticket.CreatedAt).TotalMinutes)
            .Where(x => x >= 0).ToList();
        var start = tickets.Select(t => new
            {
                Ticket = t,
                Started = t.StatusHistory.Where(h => h.ToStatus == TicketStatus.InProgress)
                    .OrderBy(h => h.ChangedAt).Select(h => (DateTime?)h.ChangedAt).FirstOrDefault(),
                Assigned = t.Assignments.OrderBy(a => a.AssignedAt).Select(a => (DateTime?)a.AssignedAt).FirstOrDefault()
            })
            .Where(x => x.Started.HasValue && x.Assigned.HasValue)
            .Select(x => (x.Started!.Value - x.Assigned!.Value).TotalMinutes).Where(x => x >= 0).ToList();
        var complete = tickets.Where(t => !t.StatusHistory.Any(h => h.Reason == "MigrationSnapshot")).ToList();
        var active = complete.Select(t => DurationInStatus(t, TicketStatus.InProgress)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var waiting = complete.Select(t => DurationInStatus(t, TicketStatus.WaitingInfo)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var review = complete.Select(t => DurationInStatus(t, TicketStatus.Resolved)).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var lead = tickets.Where(t => t.ClosedAt.HasValue)
            .Select(t => (t.ClosedAt!.Value - t.CreatedAt).TotalMinutes).Where(x => x >= 0).ToList();

        return new TicketReportSummaryDto(
            tickets.Count(t => t.Status == TicketStatus.Open),
            tickets.Count(t => t.Status == TicketStatus.Open && !t.Assignments.Any(a => a.IsActive)),
            tickets.Count(t => t.Status is TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo),
            tickets.Count(t => t.Status == TicketStatus.Resolved),
            tickets.Count(t => t.Status == TicketStatus.Closed),
            tickets.SelectMany(t => t.Reviews).Count(r => r.Decision == TicketReviewDecision.Returned),
            tickets.Count(t => t.Status is not (TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled)),
            Metric(accept), Metric(assign), Metric(start), Metric(active), Metric(waiting), Metric(review), Metric(lead),
            TicketReportAccess.Meta(request.Filter, currentUser));
    }

    private static double? DurationInStatus(Ticket ticket, TicketStatus status)
    {
        var events = ticket.StatusHistory.OrderBy(h => h.ChangedAt).ToList();
        if (events.Count == 0) return null;
        var end = ticket.ClosedAt ?? DateTime.UtcNow.AddHours(7);
        double total = 0;
        var found = false;
        for (var i = 0; i < events.Count; i++)
        {
            if (events[i].ToStatus != status) continue;
            var intervalEnd = i + 1 < events.Count ? events[i + 1].ChangedAt : end;
            if (intervalEnd < events[i].ChangedAt) continue;
            total += (intervalEnd - events[i].ChangedAt).TotalMinutes;
            found = true;
        }
        return found ? total : null;
    }

    private static TicketDurationMetricDto Metric(List<double> values)
    {
        if (values.Count == 0) return new TicketDurationMetricDto(null, null, 0);
        values.Sort();
        var median = values.Count % 2 == 1
            ? values[values.Count / 2]
            : (values[values.Count / 2 - 1] + values[values.Count / 2]) / 2;
        return new TicketDurationMetricDto(Math.Round(values.Average(), 2), Math.Round(median, 2), values.Count);
    }
}

public record GetTicketTrendQuery(TicketReportFilter Filter) : IRequest<IReadOnlyList<TicketTrendItemDto>>;

public class GetTicketTrendHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketTrendQuery, IReadOnlyList<TicketTrendItemDto>>
{
    public async Task<IReadOnlyList<TicketTrendItemDto>> Handle(GetTicketTrendQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var tickets = await TicketReportAccess.ApplyFilters(scoped, request.Filter)
            .Select(t => new { t.CreatedAt, t.ClosedAt }).ToListAsync(ct);
        var from = request.Filter.DateFrom ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7).AddDays(-30));
        var to = request.Filter.DateTo ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var opened = tickets.GroupBy(t => DateOnly.FromDateTime(t.CreatedAt)).ToDictionary(g => g.Key, g => g.Count());
        var closed = tickets.Where(t => t.ClosedAt.HasValue)
            .GroupBy(t => DateOnly.FromDateTime(t.ClosedAt!.Value)).ToDictionary(g => g.Key, g => g.Count());
        var result = new List<TicketTrendItemDto>();
        for (var date = from; date <= to; date = date.AddDays(1))
            result.Add(new TicketTrendItemDto(date, opened.GetValueOrDefault(date), closed.GetValueOrDefault(date)));
        return result;
    }
}

public record GetTicketBacklogQuery(TicketReportFilter Filter, int Page = 1, int PageSize = 20)
    : IRequest<TicketBacklogResultDto>;

public class GetTicketBacklogHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketBacklogQuery, TicketBacklogResultDto>
{
    public async Task<TicketBacklogResultDto> Handle(GetTicketBacklogQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var query = TicketReportAccess.ApplyFilters(scoped, request.Filter)
            .Where(t => t.Status != TicketStatus.Closed && t.Status != TicketStatus.Rejected && t.Status != TicketStatus.Cancelled);
        var total = await query.CountAsync(ct);
        var now = DateTime.UtcNow.AddHours(7);
        var ages = await query.Select(t => t.CreatedAt).ToListAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var raw = await query.OrderBy(t => t.Priority == TicketPriority.Critical ? 0 : t.Priority == TicketPriority.High ? 1 : 2)
            .ThenBy(t => t.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new
            {
                t.Id, t.TicketNo, t.Title, t.Status, t.Priority, DepartmentName = t.TargetDepartment.Name,
                CategoryName = t.Category.Name, TopicName = t.Topic.Name, t.CreatedAt,
                AssigneeName = t.Assignments.Where(a => a.IsActive && a.IsPrimary)
                    .Select(a => (a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).Trim()).FirstOrDefault()
            }).ToListAsync(ct);
        var items = raw.Select(t => new TicketBacklogItemDto(
            t.Id, t.TicketNo, t.Title, t.Status, t.Priority, t.DepartmentName, t.CategoryName,
            t.TopicName, t.AssigneeName, t.CreatedAt, Math.Max(0, (now.Date - t.CreatedAt.Date).Days))).ToList();
        var buckets = new Dictionary<string, int>
        {
            ["0-1"] = ages.Count(d => (now.Date - d.Date).Days <= 1),
            ["2-3"] = ages.Count(d => (now.Date - d.Date).Days is >= 2 and <= 3),
            ["4-7"] = ages.Count(d => (now.Date - d.Date).Days is >= 4 and <= 7),
            ["8-14"] = ages.Count(d => (now.Date - d.Date).Days is >= 8 and <= 14),
            ["15+"] = ages.Count(d => (now.Date - d.Date).Days >= 15)
        };
        return new TicketBacklogResultDto(items, total, page, pageSize, buckets, TicketReportAccess.Meta(request.Filter, currentUser));
    }
}

public record GetTicketCategoryReportQuery(TicketReportFilter Filter) : IRequest<IReadOnlyList<TicketCategoryReportItemDto>>;

public class GetTicketCategoryReportHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketCategoryReportQuery, IReadOnlyList<TicketCategoryReportItemDto>>
{
    public async Task<IReadOnlyList<TicketCategoryReportItemDto>> Handle(GetTicketCategoryReportQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var filtered = TicketReportAccess.ApplyFilters(scoped, request.Filter);
        var tickets = await filtered.Select(t => new
        {
            t.Id, t.CategoryId, CategoryName = t.Category.Name,
            t.TopicId, TopicName = t.Topic.Name, t.Status
        }).ToListAsync(ct);
        var returnedByTicket = await db.TicketReviews.AsNoTracking()
            .Where(r => r.Decision == TicketReviewDecision.Returned && filtered.Any(t => t.Id == r.TicketId))
            .GroupBy(r => r.TicketId)
            .Select(g => new { TicketId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TicketId, x => x.Count, ct);

        return tickets
            .GroupBy(t => new { t.CategoryId, t.CategoryName, t.TopicId, t.TopicName })
            .Select(g => new TicketCategoryReportItemDto(
                g.Key.CategoryId, g.Key.CategoryName, g.Key.TopicId, g.Key.TopicName,
                g.Count(), g.Count(t => t.Status == TicketStatus.Closed),
                g.Count(t => t.Status is not (TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled)),
                Math.Round(g.Sum(t => returnedByTicket.GetValueOrDefault(t.Id)) * 100.0 / g.Count(), 2)))
            .OrderByDescending(x => x.TotalCount)
            .ToList();
    }
}

public record GetTicketWorkloadReportQuery(TicketReportFilter Filter) : IRequest<IReadOnlyList<TicketWorkloadItemDto>>;

public class GetTicketWorkloadReportHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketWorkloadReportQuery, IReadOnlyList<TicketWorkloadItemDto>>
{
    public async Task<IReadOnlyList<TicketWorkloadItemDto>> Handle(GetTicketWorkloadReportQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var query = TicketReportAccess.ApplyFilters(scoped, request.Filter);
        var assignments = await db.TicketAssignments.AsNoTracking()
            .Where(a => query.Any(t => t.Id == a.TicketId))
            .Select(a => new
            {
                a.AssignedToEmployeeId,
                EmployeeName = (a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).Trim(),
                a.TicketId,
                a.Ticket.Status
            })
            .ToListAsync(ct);

        return assignments
            .GroupBy(a => new { a.AssignedToEmployeeId, a.EmployeeName })
            .Select(g => new TicketWorkloadItemDto(
                g.Key.AssignedToEmployeeId, g.Key.EmployeeName,
                g.Select(a => a.TicketId).Distinct().Count(),
                g.Where(a => a.Status == TicketStatus.InProgress).Select(a => a.TicketId).Distinct().Count(),
                g.Where(a => a.Status == TicketStatus.WaitingInfo).Select(a => a.TicketId).Distinct().Count(),
                g.Where(a => a.Status == TicketStatus.Resolved).Select(a => a.TicketId).Distinct().Count(),
                g.Where(a => a.Status == TicketStatus.Closed).Select(a => a.TicketId).Distinct().Count()))
            .OrderByDescending(x => x.InProgressCount)
            .ThenBy(x => x.EmployeeName)
            .ToList();
    }
}

public record GetTicketQualityReportQuery(TicketReportFilter Filter) : IRequest<TicketQualityReportDto>;

public class GetTicketQualityReportHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketQualityReportQuery, TicketQualityReportDto>
{
    public async Task<TicketQualityReportDto> Handle(GetTicketQualityReportQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var ids = await TicketReportAccess.ApplyFilters(scoped, request.Filter).Select(t => t.Id).ToListAsync(ct);
        var reviews = await db.TicketReviews.AsNoTracking().Where(r => ids.Contains(r.TicketId)).ToListAsync(ct);
        var groups = reviews.GroupBy(r => r.TicketId).ToList();
        var returned = reviews.Count(r => r.Decision == TicketReviewDecision.Returned);
        var distribution = groups.GroupBy(g => g.Count()).ToDictionary(g => g.Key, g => g.Count());
        return new TicketQualityReportDto(
            groups.Count, returned, reviews.Count(r => r.Decision == TicketReviewDecision.Approved),
            groups.Count(g => g.Any(r => r.Decision == TicketReviewDecision.Returned)),
            groups.Count == 0 ? 0 : Math.Round(groups.Count(g => g.Any(r => r.Decision == TicketReviewDecision.Returned)) * 100.0 / groups.Count, 2),
            groups.Count == 0 ? 0 : Math.Round(groups.Average(g => g.Count()), 2),
            distribution, TicketReportAccess.Meta(request.Filter, currentUser));
    }
}
