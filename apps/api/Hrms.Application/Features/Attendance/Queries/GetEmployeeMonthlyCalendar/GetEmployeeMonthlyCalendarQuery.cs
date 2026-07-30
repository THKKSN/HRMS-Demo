using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Attendance.Queries.GetEmployeeMonthlyCalendar;

public record GetEmployeeMonthlyCalendarQuery(
    Guid EmployeeId,
    int Year,
    int Month) : IRequest<List<EmployeeCalendarDayDto>>;

public class GetEmployeeMonthlyCalendarHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IScopeGuard scope)
    : IRequestHandler<GetEmployeeMonthlyCalendarQuery, List<EmployeeCalendarDayDto>>
{
    public async Task<List<EmployeeCalendarDayDto>> Handle(
        GetEmployeeMonthlyCalendarQuery request, CancellationToken ct)
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
            // Supervisor: ต้องอยู่ company เดียวกัน + แผนกเดียวกัน
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
            .Include(l => l.LeaveType)
            .Where(l => l.EmployeeId == request.EmployeeId
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= lastDay
                     && l.DateTo   >= firstDay)
            .ToListAsync(ct);

        var companyId = employee.CompanyId;
        var holidayMap = (await db.Holidays
            .Where(h => (h.CompanyId == null || h.CompanyId == companyId)
                     && h.Date >= firstDay && h.Date <= lastDay
                     && h.IsActive)
            .Select(h => new { h.Date, h.Name })
            .ToListAsync(ct))
            .ToDictionary(h => h.Date, h => h.Name);

        var workDays = employee.Company?.WorkDays ?? WorkDayFlags.MonToFri;

        var days = new List<EmployeeCalendarDayDto>();
        for (var date = firstDay; date <= lastDay; date = date.AddDays(1))
        {
            var isHoliday    = holidayMap.ContainsKey(date);
            var holidayName  = isHoliday ? holidayMap[date] : null;
            var isWorkingDay = IsWorkDay(date, workDays) && !isHoliday;

            var record = records.FirstOrDefault(r => r.Date == date);
            var leave  = leaves.FirstOrDefault(l => l.DateFrom <= date && l.DateTo >= date);

            int? workDuration = null;
            if (record?.CheckInTime != null && record.CheckOutTime != null)
                workDuration = (int)(record.CheckOutTime.Value - record.CheckInTime.Value).TotalMinutes;

            days.Add(new EmployeeCalendarDayDto(
                Date:               date,
                IsWorkingDay:       isWorkingDay,
                IsHoliday:          isHoliday,
                HolidayName:        holidayName,
                Status:             record?.Status,
                CheckInTime:        record?.CheckInTime,
                CheckOutTime:       record?.CheckOutTime,
                WorkDurationMinutes: workDuration,
                IsLate:             record?.IsLate ?? false,
                LateMinutes:        record?.LateMinutes ?? 0,
                IsOnLeave:          leave != null,
                LeaveTypeName:      leave?.LeaveType?.NameTh,
                Remark:             record?.Remark
            ));
        }

        return days;
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
