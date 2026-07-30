using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.AttendancePolicies.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.AttendancePolicies.Queries;

public record GetAttendanceViolationsQuery(
    int   Year,
    int   Month,
    Guid? EmployeeId = null,
    int   Page       = 1,
    int   PageSize   = 20
) : IRequest<PagedResult<AttendanceMonthlyViolationDto>>;

public class GetAttendanceViolationsHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceViolationsQuery, PagedResult<AttendanceMonthlyViolationDto>>
{
    public async Task<PagedResult<AttendanceMonthlyViolationDto>> Handle(
        GetAttendanceViolationsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:report", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await scope.ThrowIfCannotAccessAsync(companyId, ct);

        // ดึง policy (null = ยังไม่ตั้งค่า → ใช้ค่า default)
        var policy = await db.AttendancePolicies
            .FirstOrDefaultAsync(p => p.CompanyId == companyId && p.IsActive, ct);

        int maxLateMinutes = policy?.MaxLateMinutesPerMonth ?? 90;
        int maxLateCount   = policy?.MaxLateCountPerMonth   ?? 10;
        int maxAbsence     = policy?.MaxAbsenceCountPerMonth ?? 3;

        var firstDay = new DateOnly(request.Year, request.Month, 1);
        var lastDay  = firstDay.AddMonths(1).AddDays(-1);

        var recordsQuery = db.AttendanceRecords
            .Include(r => r.Employee)
            .Where(r => r.Date >= firstDay
                     && r.Date <= lastDay
                     && r.Employee.CompanyId == companyId
                     && r.Employee.IsActive);

        // Supervisor เห็นเฉพาะ department ของตัวเอง
        if (!currentUser.IsAdminOrHr())
        {
            var supervisorDeptId = currentUser.Roles
                .Where(r => r.Role == RoleType.Supervisor.ToString() && r.CompanyId == companyId)
                .Select(r => r.DepartmentId)
                .FirstOrDefault();

            if (supervisorDeptId.HasValue)
                recordsQuery = recordsQuery.Where(r => r.Employee.DepartmentId == supervisorDeptId.Value);
        }

        if (request.EmployeeId.HasValue)
            recordsQuery = recordsQuery.Where(r => r.EmployeeId == request.EmployeeId.Value);

        var records = await recordsQuery
            .Select(r => new
            {
                r.EmployeeId,
                EmployeeName = $"{r.Employee.FirstName} {r.Employee.LastName}",
                r.IsLate,
                r.LateMinutes,
                IsAbsent = r.Status == AttendanceStatus.Absent,
            })
            .ToListAsync(ct);

        // Group by employee
        var grouped = records
            .GroupBy(r => new { r.EmployeeId, r.EmployeeName })
            .Select(g =>
            {
                int lateCount   = g.Count(r => r.IsLate);
                int lateMinutes = g.Sum(r => r.LateMinutes);
                int absCount    = g.Count(r => r.IsAbsent);

                bool lateCountViolated   = maxLateCount   > 0 && lateCount   > maxLateCount;
                bool lateMinuteViolated  = maxLateMinutes > 0 && lateMinutes > maxLateMinutes;
                bool absViolated         = maxAbsence     > 0 && absCount    > maxAbsence;

                return new AttendanceMonthlyViolationDto(
                    g.Key.EmployeeId,
                    g.Key.EmployeeName,
                    request.Year,
                    request.Month,
                    lateCount,
                    lateMinutes,
                    absCount,
                    lateCountViolated,
                    lateMinuteViolated,
                    absViolated,
                    lateCountViolated || lateMinuteViolated || absViolated
                );
            })
            .OrderBy(x => x.EmployeeName)
            .ToList();

        var total   = grouped.Count;
        var paged   = grouped
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        return new PagedResult<AttendanceMonthlyViolationDto>(paged, total, request.Page, request.PageSize);
    }
}
