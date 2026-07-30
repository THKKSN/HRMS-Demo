using ClosedXML.Excel;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Reports.Queries.ExportAttendanceExcel;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class ExportAttendanceExcelHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService)
    : IRequestHandler<ExportAttendanceExcelQuery, byte[]>
{
    public async Task<byte[]> Handle(ExportAttendanceExcelQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:report", ct);

        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var dateFrom = new DateOnly(request.Year, request.Month, 1);
        var dateTo   = dateFrom.AddMonths(1).AddDays(-1);

        var company = await db.Companies
            .Where(c => c.Id == companyId && c.IsActive)
            .Select(c => new { c.Name, c.WorkDays })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("COMPANY_NOT_FOUND");

        var holidayDates = await db.Holidays
            .Where(h => h.IsActive
                     && h.Date >= dateFrom
                     && h.Date <= dateTo
                     && (h.CompanyId == null || h.CompanyId == companyId))
            .Select(h => h.Date)
            .ToListAsync(ct);
        var holidaySet = holidayDates.ToHashSet();

        int workingDays = 0;
        for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
            if (IsWorkDay(d, company.WorkDays) && !holidaySet.Contains(d))
                workingDays++;

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
            .OrderBy(e => e.DepartmentName)
            .ThenBy(e => e.EmployeeCode)
            .ToListAsync(ct);

        var employeeIds = employees.Select(e => e.Id).ToList();

        var records = await db.AttendanceRecords
            .Where(r => r.Date >= dateFrom && r.Date <= dateTo
                     && employeeIds.Contains(r.EmployeeId))
            .Select(r => new { r.EmployeeId, r.Date, r.Status, r.LateMinutes })
            .ToListAsync(ct);

        var leaves = await db.LeaveRequests
            .Where(l => employeeIds.Contains(l.EmployeeId)
                     && l.Status == LeaveStatus.Approved
                     && l.DateFrom <= dateTo
                     && l.DateTo   >= dateFrom)
            .Select(l => new { l.EmployeeId, l.DateFrom, l.DateTo })
            .ToListAsync(ct);

        using var wb = new XLWorkbook();

        // ===== Sheet 1: รายงานสรุปรายเดือน =====
        var ws1 = wb.Worksheets.Add("สรุปรายเดือน");

        // Header
        ws1.Cell(1, 1).Value = $"รายงานการเข้างานประจำเดือน {dateFrom:MMMM yyyy} — {company.Name}";
        ws1.Range(1, 1, 1, 10).Merge().Style
            .Font.SetBold(true)
            .Font.SetFontSize(14)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

        var headers = new[]
        {
            "รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก",
            "วันทำงาน", "มาตรงเวลา", "มาสาย", "ครึ่งวัน",
            "ขาดงาน", "ลา", "นาทีสาย", "อัตราการเข้างาน (%)"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws1.Cell(3, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1976D2"))
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        int row = 4;
        foreach (var emp in employees)
        {
            var empRecords = records.Where(r => r.EmployeeId == emp.Id).ToList();
            var empLeaves  = leaves.Where(l => l.EmployeeId == emp.Id).ToList();

            int present      = empRecords.Count(r => r.Status == AttendanceStatus.Present);
            int late         = empRecords.Count(r => r.Status == AttendanceStatus.Late);
            int halfDay      = empRecords.Count(r => r.Status == AttendanceStatus.HalfDay);
            int absent       = empRecords.Count(r => r.Status == AttendanceStatus.Absent);
            int totalLateMin = empRecords.Sum(r => r.LateMinutes);

            var recordedDates = empRecords.Select(r => r.Date).ToHashSet();
            int leaveDays = 0;
            for (var d = dateFrom; d <= dateTo; d = d.AddDays(1))
                if (!recordedDates.Contains(d) && IsWorkDay(d, company.WorkDays)
                    && !holidaySet.Contains(d)
                    && empLeaves.Any(l => l.DateFrom <= d && l.DateTo >= d))
                    leaveDays++;

            decimal rate = workingDays > 0
                ? Math.Round((present + late + halfDay) * 100m / workingDays, 1) : 0;

            ws1.Cell(row, 1).Value  = emp.EmployeeCode;
            ws1.Cell(row, 2).Value  = $"{emp.FirstName} {emp.LastName}".Trim();
            ws1.Cell(row, 3).Value  = emp.DepartmentName ?? "-";
            ws1.Cell(row, 4).Value  = workingDays;
            ws1.Cell(row, 5).Value  = present;
            ws1.Cell(row, 6).Value  = late;
            ws1.Cell(row, 7).Value  = halfDay;
            ws1.Cell(row, 8).Value  = absent;
            ws1.Cell(row, 9).Value  = leaveDays;
            ws1.Cell(row, 10).Value = totalLateMin;
            ws1.Cell(row, 11).Value = (double)rate;

            if (row % 2 == 0)
                ws1.Range(row, 1, row, 11).Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F5F5F5"));

            row++;
        }

        ws1.Columns().AdjustToContents();
        ws1.SheetView.FreezeRows(3);

        // ===== Sheet 2: รายวันละเอียด (daily records) =====
        var ws2 = wb.Worksheets.Add("รายวัน");

        var dailyHeaders = new[]
        {
            "วันที่", "รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก",
            "เวลาเข้า", "เวลาออก", "สถานะ", "นาทีสาย", "หมายเหตุ"
        };

        for (int i = 0; i < dailyHeaders.Length; i++)
        {
            var cell = ws2.Cell(1, i + 1);
            cell.Value = dailyHeaders[i];
            cell.Style.Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1976D2"))
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        var detailRecords = await db.AttendanceRecords
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .Where(r => r.Date >= dateFrom && r.Date <= dateTo
                     && employeeIds.Contains(r.EmployeeId))
            .OrderBy(r => r.Date)
            .ThenBy(r => r.Employee.EmployeeCode)
            .ToListAsync(ct);

        int dRow = 2;
        foreach (var rec in detailRecords)
        {
            ws2.Cell(dRow, 1).Value  = rec.Date.ToString("dd/MM/yyyy");
            ws2.Cell(dRow, 2).Value  = rec.Employee.EmployeeCode;
            ws2.Cell(dRow, 3).Value  = $"{rec.Employee.FirstName} {rec.Employee.LastName}".Trim();
            ws2.Cell(dRow, 4).Value  = rec.Employee.Department?.Name ?? "-";
            ws2.Cell(dRow, 5).Value  = rec.CheckInTime.HasValue
                ? rec.CheckInTime.Value.ToString("HH:mm") : "-";
            ws2.Cell(dRow, 6).Value  = rec.CheckOutTime.HasValue
                ? rec.CheckOutTime.Value.ToString("HH:mm") : "-";
            ws2.Cell(dRow, 7).Value  = rec.Status.ToString();
            ws2.Cell(dRow, 8).Value  = rec.LateMinutes;
            ws2.Cell(dRow, 9).Value  = rec.Remark ?? string.Empty;

            if (dRow % 2 == 0)
                ws2.Range(dRow, 1, dRow, 9).Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F5F5F5"));

            dRow++;
        }

        ws2.Columns().AdjustToContents();
        ws2.SheetView.FreezeRows(1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
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
