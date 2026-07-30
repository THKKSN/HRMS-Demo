using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using FluentValidation;

namespace Hrms.Application.Features.TicketReports;

internal static class TicketReportAccess
{
    public static async Task<IQueryable<Ticket>> ApplyScopeAsync(
        IQueryable<Ticket> query,
        ICurrentUser currentUser,
        IPermissionService permissions,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-report", ct);
        if (currentUser.HasRole(RoleType.Admin)) return query;

        var employeeId = currentUser.EmployeeId;
        if (currentUser.HasRole(RoleType.Supervisor) && employeeId.HasValue)
            return query.Where(t => t.TargetDepartment.ManagerEmployeeId == employeeId.Value);

        var companyIds = currentUser.ManagedCompanyIds;
        return query.Where(t => companyIds.Contains(t.TargetCompanyId));
    }

    public static IQueryable<Ticket> ApplyFilters(IQueryable<Ticket> query, TicketReportFilter filter)
    {
        var dateFrom = filter.DateFrom ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7).AddDays(-30));
        var dateTo = filter.DateTo ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        if (dateTo < dateFrom)
            throw new ValidationException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
        if (dateTo.DayNumber - dateFrom.DayNumber > 366)
            throw new ValidationException("ช่วงวันที่ของรายงานต้องไม่เกิน 1 ปี");
        if (!filter.DateBasis.Equals("CreatedAt", StringComparison.OrdinalIgnoreCase) &&
            !filter.DateBasis.Equals("ClosedAt", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("DateBasis ต้องเป็น CreatedAt หรือ ClosedAt");
        var from = dateFrom.ToDateTime(TimeOnly.MinValue);
        var toExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue);
        query = filter.DateBasis.Equals("ClosedAt", StringComparison.OrdinalIgnoreCase)
            ? query.Where(t => t.ClosedAt >= from && t.ClosedAt < toExclusive)
            : query.Where(t => t.CreatedAt >= from && t.CreatedAt < toExclusive);

        if (filter.CompanyId.HasValue) query = query.Where(t => t.TargetCompanyId == filter.CompanyId.Value);
        if (filter.DepartmentId.HasValue) query = query.Where(t => t.TargetDepartmentId == filter.DepartmentId.Value);
        if (filter.CategoryId.HasValue) query = query.Where(t => t.CategoryId == filter.CategoryId.Value);
        if (filter.TopicId.HasValue) query = query.Where(t => t.TopicId == filter.TopicId.Value);
        if (filter.Priority.HasValue) query = query.Where(t => t.Priority == filter.Priority.Value);
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status.Value);
        if (filter.RequestType.HasValue) query = query.Where(t => t.RequestType == filter.RequestType.Value);
        if (filter.ProblemType.HasValue) query = query.Where(t => t.ProblemType == filter.ProblemType.Value);
        if (filter.ResponsibleEmployeeId.HasValue)
            query = query.Where(t => t.Assignments.Any(a => a.AssignedToEmployeeId == filter.ResponsibleEmployeeId.Value));
        return query;
    }

    public static TicketReportMetaDto Meta(TicketReportFilter filter, ICurrentUser currentUser)
    {
        var now = DateTime.UtcNow.AddHours(7);
        return new TicketReportMetaDto(
            filter.DateFrom ?? DateOnly.FromDateTime(now.AddDays(-30)),
            filter.DateTo ?? DateOnly.FromDateTime(now),
            filter.DateBasis,
            "Asia/Bangkok",
            new DateOnly(2026, 7, 21),
            currentUser.HasRole(RoleType.Admin) ? "All" : "ManagedScope");
    }
}
