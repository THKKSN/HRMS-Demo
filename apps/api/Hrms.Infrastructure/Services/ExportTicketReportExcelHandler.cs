using ClosedXML.Excel;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.TicketReports;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class ExportTicketReportExcelHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ExportTicketReportQuery, TicketReportExportResult>
{
    public async Task<TicketReportExportResult> Handle(ExportTicketReportQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:export-report", ct);

        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var rows = await TicketReportAccess.ApplyFilters(scoped, request.Filter)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50_000)
            .Select(t => new
            {
                t.TicketNo,
                t.CreatedAt,
                t.ClosedAt,
                t.Status,
                t.Priority,
                SourceCompany = t.SourceCompany != null ? t.SourceCompany.Name : "",
                SourceDepartment = t.SourceDepartment != null ? t.SourceDepartment.Name : "",
                TargetCompany = t.TargetCompany.Name,
                TargetDepartment = t.TargetDepartment != null ? t.TargetDepartment.Name : "",
                // External ticket ใช้หมวดจาก external taxonomy — coalesce ให้ report เห็นชื่อหมวดเสมอ
                Category = t.Category != null
                    ? t.Category.Name
                    : t.ExternalTicketCategory != null ? t.ExternalTicketCategory.Name : "",
                Topic = t.Topic != null
                    ? t.Topic.Name
                    : t.ExternalTicketTopic != null ? t.ExternalTicketTopic.Name : "",
                t.ProblemType,
                Requester = t.RequesterEmployee != null
                    ? t.RequesterEmployee.FirstName + " " + t.RequesterEmployee.LastName
                    : t.RequesterNameSnapshot ?? t.RequesterLineDisplayNameSnapshot ?? "External requester",
                Responsible = t.Assignments
                    .OrderByDescending(a => a.AssignedAt)
                    .Select(a => a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName)
                    .FirstOrDefault(),
                ReviewCount = t.Reviews.Count(),
                ReturnCount = t.Reviews.Count(r => r.Decision == TicketReviewDecision.Returned)
            })
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Ticket Report");

        var headers = new[]
        {
            "TicketNo", "CreatedAt", "ClosedAt", "Status", "Priority",
            "SourceCompany", "SourceDepartment", "TargetCompany", "TargetDepartment",
            "Category", "Topic", "ProblemType", "Requester", "Responsible",
            "ReviewCount", "ReturnCount", "TotalLeadMinutes"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1976D2"))
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        var rowIndex = 2;
        foreach (var row in rows)
        {
            var leadMinutes = row.ClosedAt.HasValue
                ? Math.Round((row.ClosedAt.Value - row.CreatedAt).TotalMinutes, 2)
                : (double?)null;

            ws.Cell(rowIndex, 1).Value = row.TicketNo;
            ws.Cell(rowIndex, 2).Value = row.CreatedAt;
            ws.Cell(rowIndex, 3).Value = row.ClosedAt;
            ws.Cell(rowIndex, 4).Value = row.Status.ToString();
            ws.Cell(rowIndex, 5).Value = row.Priority.ToString();
            ws.Cell(rowIndex, 6).Value = row.SourceCompany;
            ws.Cell(rowIndex, 7).Value = row.SourceDepartment;
            ws.Cell(rowIndex, 8).Value = row.TargetCompany;
            ws.Cell(rowIndex, 9).Value = row.TargetDepartment;
            ws.Cell(rowIndex, 10).Value = row.Category;
            ws.Cell(rowIndex, 11).Value = row.Topic;
            ws.Cell(rowIndex, 12).Value = row.ProblemType?.ToString() ?? "";
            ws.Cell(rowIndex, 13).Value = row.Requester;
            ws.Cell(rowIndex, 14).Value = row.Responsible ?? "";
            ws.Cell(rowIndex, 15).Value = row.ReviewCount;
            ws.Cell(rowIndex, 16).Value = row.ReturnCount;
            ws.Cell(rowIndex, 17).Value = leadMinutes;

            if (rowIndex % 2 == 0)
                ws.Range(rowIndex, 1, rowIndex, headers.Length)
                    .Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F5F5F5"));

            rowIndex++;
        }

        ws.Column(2).Style.DateFormat.Format = "yyyy-mm-dd hh:mm:ss";
        ws.Column(3).Style.DateFormat.Format = "yyyy-mm-dd hh:mm:ss";
        ws.Range(1, 1, Math.Max(1, rowIndex - 1), headers.Length).SetAutoFilter();
        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);

        var now = DateTime.UtcNow.AddHours(7);
        await auditLog.LogAsync("ticket", "TicketReport", now.ToString("yyyyMMddHHmmss"), "export-ticket-report",
            $"ส่งออกรายงาน Ticket จำนวน {rows.Count} แถว", null,
            new { request.Filter, RowCount = rows.Count, Format = "Excel" }, ct);

        return new TicketReportExportResult(
            ms.ToArray(),
            $"ticket-report-{now:yyyyMMdd-HHmmss}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            rows.Count);
    }
}
