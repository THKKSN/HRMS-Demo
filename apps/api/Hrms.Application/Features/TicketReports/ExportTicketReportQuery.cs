using System.Text;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.TicketReports;

public record ExportTicketReportQuery(TicketReportFilter Filter) : IRequest<TicketReportExportResult>;

public class ExportTicketReportHandler(
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
                t.TicketNo, t.CreatedAt, t.ClosedAt, t.Status, t.Priority,
                SourceCompany = t.SourceCompany.Name,
                SourceDepartment = t.SourceDepartment != null ? t.SourceDepartment.Name : "",
                TargetCompany = t.TargetCompany.Name,
                TargetDepartment = t.TargetDepartment.Name,
                Category = t.Category.Name, Topic = t.Topic.Name, t.ProblemType,
                Requester = t.RequesterEmployee.FirstName + " " + t.RequesterEmployee.LastName,
                Responsible = t.Assignments.OrderByDescending(a => a.AssignedAt)
                    .Select(a => a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).FirstOrDefault(),
                ReviewCount = t.Reviews.Count(),
                ReturnCount = t.Reviews.Count(r => r.Decision == TicketReviewDecision.Returned)
            }).ToListAsync(ct);

        var csv = new StringBuilder();
        csv.AppendLine("TicketNo,CreatedAt,ClosedAt,Status,Priority,SourceCompany,SourceDepartment,TargetCompany,TargetDepartment,Category,Topic,ProblemType,Requester,Responsible,ReviewCount,ReturnCount,TotalLeadMinutes");
        foreach (var row in rows)
        {
            var lead = row.ClosedAt.HasValue ? Math.Round((row.ClosedAt.Value - row.CreatedAt).TotalMinutes, 2).ToString() : "";
            csv.AppendLine(string.Join(',', new[]
            {
                Csv(row.TicketNo), Csv(row.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")), Csv(row.ClosedAt?.ToString("yyyy-MM-dd HH:mm:ss")),
                Csv(row.Status.ToString()), Csv(row.Priority.ToString()), Csv(row.SourceCompany), Csv(row.SourceDepartment),
                Csv(row.TargetCompany), Csv(row.TargetDepartment), Csv(row.Category), Csv(row.Topic), Csv(row.ProblemType?.ToString()),
                Csv(row.Requester), Csv(row.Responsible), row.ReviewCount.ToString(), row.ReturnCount.ToString(), lead
            }));
        }

        var now = DateTime.UtcNow.AddHours(7);
        await auditLog.LogAsync("ticket", "TicketReport", now.ToString("yyyyMMddHHmmss"), "export-ticket-report",
            $"ส่งออกรายงาน Ticket จำนวน {rows.Count} แถว", null,
            new { request.Filter, RowCount = rows.Count }, ct);
        return new TicketReportExportResult(
            new UTF8Encoding(true).GetBytes(csv.ToString()),
            $"ticket-report-{now:yyyyMMdd-HHmmss}.csv", "text/csv; charset=utf-8", rows.Count);
    }

    private static string Csv(string? value)
        => $"\"{(value ?? string.Empty).Replace("\"", "\"\"")}\"";
}
