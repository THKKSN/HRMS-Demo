using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Reports.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Reports.Queries.GetAttendanceMonthlySummary;

public class GetAttendanceMonthlySummaryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<GetAttendanceMonthlySummaryQuery, IReadOnlyList<AttendanceMonthlySummaryDto>>
{
    public async Task<IReadOnlyList<AttendanceMonthlySummaryDto>> Handle(
        GetAttendanceMonthlySummaryQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:report", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var dateFrom = new DateOnly(request.Year, request.Month, 1);
        var dateTo   = dateFrom.AddMonths(1).AddDays(-1);

        // ดึง WorkDays จาก Company
        var company = await db.Companies
            .Where(c => c.Id == companyId && c.IsActive)
            .Select(c => new { c.WorkDays })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("COMPANY_NOT_FOUND");

        // วันหยุดในเดือนนี้ (national + company)
        var holidayDates = await db.Holidays
            .Where(h => h.IsActive
                     && h.Date >= dateFrom
                     && h.Date <= dateTo
                     && (h.CompanyId == null || h.CompanyId == companyId))
            .Select(h => h.Date)
            .ToListAsync(ct);
        var holidaySet = holidayDates.ToHashSet();

        // นับ working days ในเดือน
        int workingDays = 0;
        for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
        {
            if (IsWorkDay(d, company.WorkDays) && !holidaySet.Contains(d))
                workingDays++;
        }

        // ดึงพนักงานในบริษัท (กรอง department ถ้าระบุ)
        var employeeQuery = db.Employees
            .Include(e => e.Department)
            .Where(e => e.CompanyId == companyId && e.IsActive);

        if (request.DepartmentId.HasValue)
            employeeQuery = employeeQuery.Where(e => e.DepartmentId == request.DepartmentId);

        var employees = await employeeQuery
            .Select(e => new
            {
                e.Id,
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                DepartmentName = e.Department == null ? null : e.Department.Name
            })
            .ToListAsync(ct);

        var employeeIds = employees.Select(e => e.Id).ToList();

        // โหลด attendance records ทั้งเดือน
        var records = await db.AttendanceRecords
            .Where(r => r.Date >= dateFrom
                     && r.Date <= dateTo
                     && employeeIds.Contains(r.EmployeeId))
            .Select(r => new
            {
                r.EmployeeId,
                r.Date,
                r.Status,
                r.LateMinutes
            })
            .ToListAsync(ct);

        // โหลด approved leave ทั้งเดือน
        var leaves = await db.LeaveRequests
            .Where(l => employeeIds.Contains(l.EmployeeId)
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= dateTo
                     && l.DateTo   >= dateFrom)
            .Select(l => new { l.EmployeeId, l.DateFrom, l.DateTo })
            .ToListAsync(ct);

        var result = new List<AttendanceMonthlySummaryDto>();

        foreach (var emp in employees)
        {
            var empRecords = records.Where(r => r.EmployeeId == emp.Id).ToList();
            var empLeaves  = leaves.Where(l => l.EmployeeId == emp.Id).ToList();

            int present         = empRecords.Count(r => r.Status == AttendanceStatus.Present);
            int late            = empRecords.Count(r => r.Status == AttendanceStatus.Late);
            int halfDay         = empRecords.Count(r => r.Status == AttendanceStatus.HalfDay);
            int absent          = empRecords.Count(r => r.Status == AttendanceStatus.Absent);
            int totalLateMin    = empRecords.Sum(r => r.LateMinutes);

            // นับวันลา: วันที่มี approved leave แต่ไม่มี attendance record
            var recordedDates = empRecords.Select(r => r.Date).ToHashSet();
            int leaveDays = 0;
            for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
            {
                if (!recordedDates.Contains(d)
                    && IsWorkDay(d, company.WorkDays)
                    && !holidaySet.Contains(d)
                    && empLeaves.Any(l => l.DateFrom <= d && l.DateTo >= d))
                {
                    leaveDays++;
                }
            }

            decimal rate = workingDays > 0
                ? Math.Round((present + late + halfDay) * 100m / workingDays, 1)
                : 0;

            result.Add(new AttendanceMonthlySummaryDto(
                emp.Id,
                emp.EmployeeCode,
                $"{emp.FirstName} {emp.LastName}".Trim(),
                emp.DepartmentName,
                workingDays,
                present,
                late,
                halfDay,
                absent,
                leaveDays,
                totalLateMin,
                rate));
        }

        return result.OrderBy(r => r.DepartmentName).ThenBy(r => r.EmployeeCode).ToList();
    }

    private static bool IsWorkDay(DateOnly date, WorkDayFlags flags)
    {
        var flag = date.DayOfWeek switch
        {
            DayOfWeek.Monday    => WorkDayFlags.Monday,
            DayOfWeek.Tuesday   => WorkDayFlags.Tuesday,
            DayOfWeek.Wednesday => WorkDayFlags.Wednesday,
            DayOfWeek.Thursday  => WorkDayFlags.Thursday,
            DayOfWeek.Friday    => WorkDayFlags.Friday,
            DayOfWeek.Saturday  => WorkDayFlags.Saturday,
            DayOfWeek.Sunday    => WorkDayFlags.Sunday,
            _                   => WorkDayFlags.None
        };
        return (flags & flag) != WorkDayFlags.None;
    }
}
