using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Dashboard.Queries.GetTeamDashboard;

public class GetTeamDashboardHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetTeamDashboardQuery, TeamDashboardDto>
{
    public async Task<TeamDashboardDto> Handle(GetTeamDashboardQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "leave:view-team", ct);

        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        // ── หา department ที่ Supervisor นี้เป็น manager ───────────
        var managedDeptIds = await db.Departments
            .Where(d => d.ManagerEmployeeId == employeeId && d.IsActive)
            .Select(d => d.Id)
            .ToListAsync(ct);

        // ถ้าไม่เป็น manager department ไหนเลย ให้ fallback ใช้ department ของตัวเอง
        if (managedDeptIds.Count == 0)
        {
            var myDeptId = await db.Employees
                .Where(e => e.Id == employeeId)
                .Select(e => e.DepartmentId)
                .FirstOrDefaultAsync(ct);

            if (myDeptId.HasValue)
                managedDeptIds = [myDeptId.Value];
        }

        // ── สมาชิกในทีม ─────────────────────────────────────────────
        var teamEmployeeIds = await db.Employees
            .Where(e =>
                e.CompanyId == companyId &&
                e.IsActive &&
                e.DepartmentId.HasValue &&
                managedDeptIds.Contains(e.DepartmentId!.Value) &&
                e.Id != employeeId)
            .Select(e => e.Id)
            .ToListAsync(ct);

        var teamSize = teamEmployeeIds.Count;

        // ── คำขอลารออนุมัติ (ของทีม ที่รอ supervisor) ──────────────
        var pendingApprovals = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Where(r =>
                teamEmployeeIds.Contains(r.EmployeeId) &&
                r.Status == LeaveStatus.PendingSupervisor)
            .OrderBy(r => r.DateFrom)
            .Select(r => new TeamPendingApprovalItem(
                r.Id.ToString(),
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.LeaveType.NameTh,
                r.DateFrom.ToString("yyyy-MM-dd"),
                r.DateTo.ToString("yyyy-MM-dd"),
                r.TotalDays))
            .ToListAsync(ct);

        // ── สถิติวันนี้ของทีม ────────────────────────────────────────
        var todayRecords = await db.AttendanceRecords
            .Where(r => teamEmployeeIds.Contains(r.EmployeeId) && r.Date == today)
            .Include(r => r.Employee)
            .Select(r => new { r.EmployeeId, r.Employee.FirstName, r.Employee.LastName, r.Status, r.LateMinutes })
            .ToListAsync(ct);

        // ใครลาวันนี้ (Approved, ทับซ้อนกับวันนี้)
        var onLeaveToday = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Where(r =>
                teamEmployeeIds.Contains(r.EmployeeId) &&
                r.Status == LeaveStatus.Approved &&
                r.DateFrom <= today && r.DateTo >= today)
            .Select(r => new TeamOnLeaveItem(
                r.EmployeeId.ToString(),
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.LeaveType.NameTh))
            .ToListAsync(ct);

        var onLeaveIds = onLeaveToday.Select(x => Guid.Parse(x.EmployeeId)).ToHashSet();

        var todayAbsent = teamEmployeeIds
            .Except(todayRecords.Select(r => r.EmployeeId))
            .Except(onLeaveIds)
            .ToList();

        // ดึงชื่อพนักงานที่ขาด
        var absentNames = await db.Employees
            .Where(e => todayAbsent.Contains(e.Id))
            .Select(e => new TeamMemberItem(
                e.Id.ToString(),
                (e.FirstName + " " + e.LastName).Trim()))
            .ToListAsync(ct);

        var lateItems = todayRecords
            .Where(r => r.Status == AttendanceStatus.Late)
            .Select(r => new TeamLateItem(
                r.EmployeeId.ToString(),
                (r.FirstName + " " + r.LastName).Trim(),
                r.LateMinutes))
            .ToList();

        var todayStats = new TeamTodayStatsDto(
            Present:     todayRecords.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late),
            Late:        todayRecords.Count(r => r.Status == AttendanceStatus.Late),
            Absent:      todayAbsent.Count,
            OnLeave:     onLeaveToday.Count,
            NotRecorded: teamSize - todayRecords.Count - onLeaveToday.Count);

        return new TeamDashboardDto(
            teamSize,
            pendingApprovals.Count,
            todayStats,
            absentNames,
            lateItems,
            onLeaveToday,
            pendingApprovals);
    }
}
