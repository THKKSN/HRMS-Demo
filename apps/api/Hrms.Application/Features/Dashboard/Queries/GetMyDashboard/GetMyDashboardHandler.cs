using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Dashboard.Queries.GetMyDashboard;

public class GetMyDashboardHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMyDashboardQuery, MyDashboardDto>
{
    public async Task<MyDashboardDto> Handle(GetMyDashboardQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var today     = DateTime.UtcNow.AddHours(7);
        var todayOnly = DateOnly.FromDateTime(today);
        var year      = today.Year;
        var month     = today.Month;

        // ── วันนี้เช็คอินหรือยัง ─────────────────────────────────────
        var todayRecord = await db.AttendanceRecords
            .Where(r => r.EmployeeId == employeeId && r.Date == todayOnly)
            .Select(r => new
            {
                r.Id, r.Date, r.CheckInTime, r.CheckOutTime,
                r.Status, r.IsLate, r.LateMinutes
            })
            .FirstOrDefaultAsync(ct);

        var todayDto = todayRecord is null ? null : new MyTodayAttendanceDto(
            todayRecord.Id,
            todayRecord.Date.ToString("yyyy-MM-dd"),
            todayRecord.CheckInTime?.ToString("HH:mm:ss"),
            todayRecord.CheckOutTime?.ToString("HH:mm:ss"),
            todayRecord.Status,
            todayRecord.IsLate,
            todayRecord.LateMinutes);

        // ── วันลาคงเหลือ (เฉพาะ totalDays > 0) ─────────────────────
        var balances = await db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == employeeId && b.Year == year && b.TotalDays > 0)
            .OrderBy(b => b.LeaveType.NameTh)
            .Select(b => new MyLeaveBalanceItem(
                b.LeaveType.NameTh,
                b.RemainingDays,
                b.TotalDays,
                b.PendingDays))
            .ToListAsync(ct);

        // ── คำขอลา pending ──────────────────────────────────────────
        var pendingLeaveCount = await db.LeaveRequests
            .CountAsync(r =>
                r.EmployeeId == employeeId &&
                (r.Status == LeaveStatus.PendingSupervisor || r.Status == LeaveStatus.PendingHr),
                ct);

        // ── สถิติการเข้างานเดือนนี้ ──────────────────────────────────
        var monthRecords = await db.AttendanceRecords
            .Where(r =>
                r.EmployeeId == employeeId &&
                r.Date.Year == year && r.Date.Month == month)
            .Select(r => r.Status)
            .ToListAsync(ct);

        // นับวันลาจาก LeaveRequests (Approved ที่ทับซ้อนกับเดือนนี้)
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd   = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
        var leaveDays = await db.LeaveRequests
            .Where(r =>
                r.EmployeeId == employeeId &&
                r.Status == LeaveStatus.Approved &&
                r.DateFrom <= monthEnd &&
                r.DateTo   >= monthStart)
            .SumAsync(r => (decimal?)r.TotalDays, ct) ?? 0m;

        var monthStats = new MyMonthStatsDto(
            PresentDays:  monthRecords.Count(s => s == AttendanceStatus.Present || s == AttendanceStatus.Late),
            LateDays:     monthRecords.Count(s => s == AttendanceStatus.Late),
            AbsentDays:   monthRecords.Count(s => s == AttendanceStatus.Absent),
            LeaveDays:    (int)Math.Round(leaveDays),
            WorkingDays:  monthRecords.Count);

        return new MyDashboardDto(todayDto, balances, pendingLeaveCount, monthStats);
    }
}
