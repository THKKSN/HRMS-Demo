using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetEmployeeMonthlyStats;

public record GetEmployeeMonthlyStatsQuery(
    Guid EmployeeId,
    int Year,
    int Month) : IRequest<EmployeeMonthlyStatsDto>;

public class GetEmployeeMonthlyStatsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IScopeGuard scope)
    : IRequestHandler<GetEmployeeMonthlyStatsQuery, EmployeeMonthlyStatsDto>
{
    public async Task<EmployeeMonthlyStatsDto> Handle(
        GetEmployeeMonthlyStatsQuery request, CancellationToken ct)
    {
        var canViewAll  = await permService.HasPermissionAsync(currentUser, "attendance:view-all",  ct);
        var canViewTeam = await permService.HasPermissionAsync(currentUser, "attendance:view-team", ct);

        if (!canViewAll && !canViewTeam)
            throw new AppForbiddenException("ไม่มีสิทธิ์ดูการเข้างาน");

        var employee = await db.Employees
            .Include(e => e.Company)
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException($"ไม่พบพนักงาน Id '{request.EmployeeId}'");

        if (canViewAll)
        {
            await scope.ThrowIfCannotAccessAsync(employee.CompanyId, ct);
        }
        else
        {
            var caller = await db.Employees
                .FirstOrDefaultAsync(e => e.Id == currentUser.EmployeeId && e.IsActive, ct)
                ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

            if (caller.CompanyId != employee.CompanyId)
                throw new AppForbiddenException("ไม่มีสิทธิ์ดูข้อมูลพนักงานของบริษัทอื่น");

            if (!caller.DepartmentId.HasValue || caller.DepartmentId != employee.DepartmentId)
                throw new AppForbiddenException("ไม่มีสิทธิ์ดูการเข้างานของพนักงานนอกแผนก");
        }

        var firstDay = new DateOnly(request.Year, request.Month, 1);
        var lastDay  = firstDay.AddMonths(1).AddDays(-1);

        var records = await db.AttendanceRecords
            .Where(r => r.EmployeeId == request.EmployeeId
                     && r.Date >= firstDay && r.Date <= lastDay)
            .ToListAsync(ct);

        var leaves = await db.LeaveRequests
            .Where(l => l.EmployeeId == request.EmployeeId
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= lastDay
                     && l.DateTo   >= firstDay)
            .ToListAsync(ct);

        var companyId  = employee.CompanyId;
        var holidaySet = (await db.Holidays
            .Where(h => (h.CompanyId == null || h.CompanyId == companyId)
                     && h.Date >= firstDay && h.Date <= lastDay
                     && h.IsActive)
            .Select(h => h.Date)
            .ToListAsync(ct))
            .ToHashSet();

        var workDays = employee.Company?.WorkDays ?? WorkDayFlags.MonToFri;

        int workingDays = 0, presentDays = 0, lateDays = 0, halfDays = 0,
            absentDays  = 0, leaveDays   = 0, notRecordedDays = 0,
            totalLateMinutes = 0, totalWorkMinutes = 0, workDaysWithDuration = 0;

        var recordedDates = records.Select(r => r.Date).ToHashSet();

        for (var date = firstDay; date <= lastDay; date = date.AddDays(1))
        {
            if (!IsWorkDay(date, workDays) || holidaySet.Contains(date)) continue;
            workingDays++;

            var record  = records.FirstOrDefault(r => r.Date == date);
            var onLeave = leaves.Any(l => l.DateFrom <= date && l.DateTo >= date);

            if (record != null)
            {
                switch (record.Status)
                {
                    case AttendanceStatus.Present:  presentDays++; break;
                    case AttendanceStatus.Late:     lateDays++;    break;
                    case AttendanceStatus.HalfDay:  halfDays++;    break;
                    case AttendanceStatus.Absent:   absentDays++;  break;
                }
                totalLateMinutes += record.LateMinutes;

                if (record.CheckInTime != null && record.CheckOutTime != null)
                {
                    totalWorkMinutes   += (int)(record.CheckOutTime.Value - record.CheckInTime.Value).TotalMinutes;
                    workDaysWithDuration++;
                }
            }
            else if (onLeave)
            {
                leaveDays++;
            }
            else
            {
                notRecordedDays++;
            }
        }

        var attendedDays = presentDays + lateDays + halfDays;
        var attendanceRate = workingDays > 0
            ? Math.Round((decimal)attendedDays / workingDays * 100, 1)
            : 0m;

        int? avgWorkDuration = workDaysWithDuration > 0
            ? totalWorkMinutes / workDaysWithDuration
            : null;

        return new EmployeeMonthlyStatsDto(
            EmployeeId:             employee.Id,
            EmployeeFullName:       $"{employee.FirstName} {employee.LastName}".Trim(),
            EmployeeCode:           employee.EmployeeCode,
            CompanyName:            employee.Company?.Name,
            DepartmentName:         employee.Department?.Name,
            Year:                   request.Year,
            Month:                  request.Month,
            WorkingDays:            workingDays,
            PresentDays:            presentDays,
            LateDays:               lateDays,
            HalfDays:               halfDays,
            AbsentDays:             absentDays,
            LeaveDays:              leaveDays,
            NotRecordedDays:        notRecordedDays,
            TotalLateMinutes:       totalLateMinutes,
            AttendanceRate:         attendanceRate,
            AvgWorkDurationMinutes: avgWorkDuration
        );
    }

    private static bool IsWorkDay(DateOnly date, WorkDayFlags workDays) =>
        date.DayOfWeek switch
        {
            DayOfWeek.Monday    => workDays.HasFlag(WorkDayFlags.Monday),
            DayOfWeek.Tuesday   => workDays.HasFlag(WorkDayFlags.Tuesday),
            DayOfWeek.Wednesday => workDays.HasFlag(WorkDayFlags.Wednesday),
            DayOfWeek.Thursday  => workDays.HasFlag(WorkDayFlags.Thursday),
            DayOfWeek.Friday    => workDays.HasFlag(WorkDayFlags.Friday),
            DayOfWeek.Saturday  => workDays.HasFlag(WorkDayFlags.Saturday),
            DayOfWeek.Sunday    => workDays.HasFlag(WorkDayFlags.Sunday),
            _                   => false,
        };
}
