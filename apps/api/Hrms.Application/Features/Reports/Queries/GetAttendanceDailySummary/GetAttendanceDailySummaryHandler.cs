using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Reports.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceDailySummary;

public class GetAttendanceDailySummaryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceDailySummaryQuery, AttendanceDailySummaryDto>
{
    public async Task<AttendanceDailySummaryDto> Handle(
        GetAttendanceDailySummaryQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:report", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var date = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        var totalEmployees = await db.Employees
            .CountAsync(e => e.CompanyId == companyId && e.IsActive, ct);

        // attendance records วันนี้
        var records = await db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Where(r => r.Date == date && r.Employee.CompanyId == companyId && r.Employee.IsActive)
            .ToListAsync(ct);

        // approved leave ที่ครอบคลุมวันนี้
        var onLeaveEmployeeIds = await db.LeaveRequests
            .Where(l => l.Employee.CompanyId == companyId
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= date
                     && l.DateTo   >= date)
            .Select(l => l.EmployeeId)
            .Distinct()
            .ToListAsync(ct);

        var recordedIds = records.Select(r => r.EmployeeId).ToHashSet();
        var onLeaveIds  = onLeaveEmployeeIds.ToHashSet();

        int present  = records.Count(r => r.Status == AttendanceStatus.Present);
        int late     = records.Count(r => r.Status == AttendanceStatus.Late);
        int halfDay  = records.Count(r => r.Status == AttendanceStatus.HalfDay);
        int absent   = records.Count(r => r.Status == AttendanceStatus.Absent);

        // OnLeave = มี approved leave แต่ไม่มี attendance record (ลาจริงๆ ไม่ได้มาเช็คอิน)
        int onLeave     = onLeaveIds.Count(id => !recordedIds.Contains(id));
        int notRecorded = totalEmployees - present - late - halfDay - absent - onLeave;
        notRecorded = Math.Max(0, notRecorded);

        decimal rate = totalEmployees > 0
            ? Math.Round((present + late + halfDay) * 100m / totalEmployees, 1)
            : 0;

        var topAbsent = records
            .Where(r => r.Status == AttendanceStatus.Absent)
            .Select(r => new AbsentLateItemDto(
                r.EmployeeId,
                $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
                r.Employee.Department?.Name,
                null))
            .ToList();

        var topLate = records
            .Where(r => r.Status == AttendanceStatus.Late && r.LateMinutes > 0)
            .OrderByDescending(r => r.LateMinutes)
            .Take(10)
            .Select(r => new AbsentLateItemDto(
                r.EmployeeId,
                $"{r.Employee.FirstName} {r.Employee.LastName}".Trim(),
                r.Employee.Department?.Name,
                r.LateMinutes))
            .ToList();

        return new AttendanceDailySummaryDto(
            date, totalEmployees,
            present, late, halfDay, absent, onLeave, notRecorded, rate,
            topAbsent, topLate);
    }
}
