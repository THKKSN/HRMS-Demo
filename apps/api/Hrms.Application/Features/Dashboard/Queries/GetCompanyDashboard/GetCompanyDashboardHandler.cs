using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Dashboard.Queries.GetCompanyDashboard;

public class GetCompanyDashboardHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IScopeGuard scopeGuard)
    : IRequestHandler<GetCompanyDashboardQuery, CompanyDashboardDto>
{
    public async Task<CompanyDashboardDto> Handle(GetCompanyDashboardQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:view-all", ct);

        var now   = DateTime.UtcNow.AddHours(7);
        var today = DateOnly.FromDateTime(now);

        // null = ทุกบริษัท (Admin / HQ HR), Set = บริษัทที่เข้าถึงได้
        var accessibleIds = await scopeGuard.GetAccessibleCompanyIdsAsync(ct);
        var isSystemWide  = accessibleIds is null;

        // ถ้าเลือกบริษัทเฉพาะเจาะจง — ตรวจสิทธิ์ก่อน แล้ว filter เฉพาะบริษัทนั้น
        IReadOnlySet<Guid>? filterIds = accessibleIds;
        bool filterIsSystemWide = isSystemWide;

        string? selectedCompanyName = null;
        if (request.CompanyId.HasValue)
        {
            var canAccess = isSystemWide || (accessibleIds?.Contains(request.CompanyId.Value) == true);
            if (!canAccess)
                throw new AppForbiddenException("ไม่มีสิทธิ์เข้าถึงบริษัทนี้");

            filterIds           = new HashSet<Guid> { request.CompanyId.Value };
            filterIsSystemWide  = false;
            selectedCompanyName = await db.Companies
                .Where(c => c.Id == request.CompanyId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(ct);
        }

        // ── จำนวนพนักงานทั้งหมด ─────────────────────────────────────
        var totalEmployees = await db.Employees
            .CountAsync(e => e.IsActive && (filterIsSystemWide || filterIds!.Contains(e.CompanyId)), ct);

        // ── บันทึกการเข้างานวันนี้ ────────────────────────────────────
        var todayRecords = await db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Where(r =>
                r.Date == today &&
                r.Employee.IsActive &&
                (filterIsSystemWide || filterIds!.Contains(r.Employee.CompanyId)))
            .Select(r => new
            {
                r.EmployeeId,
                r.Status,
                DepartmentName = r.Employee.Department != null ? r.Employee.Department.Name : null
            })
            .ToListAsync(ct);

        // ── ใครลาวันนี้ ──────────────────────────────────────────────
        var onLeaveTodayIds = await db.LeaveRequests
            .Include(r => r.Employee)
            .Where(r =>
                r.Employee.IsActive &&
                (filterIsSystemWide || filterIds!.Contains(r.Employee.CompanyId)) &&
                r.Status == LeaveStatus.Approved &&
                r.DateFrom <= today && r.DateTo >= today)
            .Select(r => r.EmployeeId)
            .Distinct()
            .ToListAsync(ct);

        var onLeaveCount     = onLeaveTodayIds.Count;
        var checkedInIds     = todayRecords.Select(r => r.EmployeeId).ToHashSet();
        var onLeaveIdsSet    = onLeaveTodayIds.ToHashSet();
        var notRecordedCount = Math.Max(0, totalEmployees - checkedInIds.Count - onLeaveIdsSet.Except(checkedInIds).Count());

        var present = todayRecords.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late);
        var late    = todayRecords.Count(r => r.Status == AttendanceStatus.Late);
        var absent  = todayRecords.Count(r => r.Status == AttendanceStatus.Absent);
        var rate    = totalEmployees > 0
            ? Math.Round((decimal)present / totalEmployees * 100, 2)
            : 0m;

        var todayStats = new CompanyTodayStatsDto(present, late, absent, onLeaveCount, notRecordedCount, rate);

        // ── รออนุมัติการลา ────────────────────────────────────────────
        var pendingLeaveApprovals = await db.LeaveRequests
            .Include(r => r.Employee)
            .CountAsync(r =>
                r.Employee.IsActive &&
                (filterIsSystemWide || filterIds!.Contains(r.Employee.CompanyId)) &&
                (r.Status == LeaveStatus.PendingSupervisor || r.Status == LeaveStatus.PendingHr),
                ct);

        // ── แผนกที่มีคนขาดมากสุด (วันนี้) ───────────────────────────
        var topAbsent = todayRecords
            .Where(r => r.Status == AttendanceStatus.Absent && r.DepartmentName != null)
            .GroupBy(r => r.DepartmentName!)
            .Select(g => new DeptAbsentItem(g.Key, g.Count()))
            .OrderByDescending(x => x.AbsentCount)
            .Take(5)
            .ToList();

        // ── Trend 30 วัน ─────────────────────────────────────────────
        var since = today.AddDays(-29);
        var trendRecords = await db.AttendanceRecords
            .Where(r =>
                r.Date >= since && r.Date <= today &&
                r.Employee.IsActive &&
                (filterIsSystemWide || filterIds!.Contains(r.Employee.CompanyId)))
            .Select(r => new { r.Date, r.Status })
            .ToListAsync(ct);

        var leaveByDate = await db.LeaveRequests
            .Where(r =>
                r.Employee.IsActive &&
                (filterIsSystemWide || filterIds!.Contains(r.Employee.CompanyId)) &&
                r.Status == LeaveStatus.Approved &&
                r.DateFrom <= today && r.DateTo >= since)
            .Select(r => new { r.DateFrom, r.DateTo })
            .ToListAsync(ct);

        var trend = Enumerable.Range(0, 30)
            .Select(i =>
            {
                var d     = since.AddDays(i);
                var recs  = trendRecords.Where(r => r.Date == d).ToList();
                var leave = leaveByDate.Count(l => l.DateFrom <= d && l.DateTo >= d);
                return new TrendItem(
                    d.ToString("yyyy-MM-dd"),
                    recs.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late),
                    recs.Count(r => r.Status == AttendanceStatus.Late),
                    recs.Count(r => r.Status == AttendanceStatus.Absent),
                    leave);
            })
            .ToList();

        return new CompanyDashboardDto(
            totalEmployees,
            todayStats,
            pendingLeaveApprovals,
            topAbsent,
            trend,
            isSystemWide,
            request.CompanyId,
            selectedCompanyName);
    }
}
