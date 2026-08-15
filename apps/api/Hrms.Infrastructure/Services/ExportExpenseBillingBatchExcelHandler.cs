using System.Text.Json;
using ClosedXML.Excel;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExpenseBillingBatches.Commands;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class ExportExpenseBillingBatchExcelHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ExportExpenseBillingBatchCommand, ExpenseBillingBatchExportResult>
{
    public async Task<ExpenseBillingBatchExportResult> Handle(ExportExpenseBillingBatchCommand request, CancellationToken ct)
    {
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:export", ct);

        var batch = await db.ExpenseBillingBatches
            .Include(x => x.CreatedByEmployee)
            .Include(x => x.Items)
                .ThenInclude(x => x.ExpenseClaim)
                    .ThenInclude(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรอบวางบิล");

        if (batch.Status == ExpenseBillingBatchStatus.Cancelled)
            throw new ConflictException("EXPENSE_BATCH_CANCELLED", "ไม่สามารถ export รอบวางบิลที่ยกเลิกแล้ว");

        using var wb = new XLWorkbook();
        BuildSummarySheet(wb, batch);
        BuildClaimsSheet(wb, batch);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);

        var oldStatus = batch.Status;
        var now = DateTime.UtcNow.AddHours(7);
        batch.ExportedAt = now;
        batch.UpdatedBy = actorId;
        if (batch.Status == ExpenseBillingBatchStatus.Draft)
            batch.Status = ExpenseBillingBatchStatus.Exported;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseBillingBatch",
            entityId: batch.Id.ToString(),
            action: "export-expense-billing-batch",
            description: $"ส่งออกรอบวางบิล {batch.BatchNo} จำนวน {batch.TotalClaims} รายการ",
            oldValues: new { status = oldStatus.ToString(), batch.ExportedAt },
            newValues: new { status = batch.Status.ToString(), ExportedAt = now, RowCount = batch.Items.Count },
            ct: ct);

        return new ExpenseBillingBatchExportResult(
            ms.ToArray(),
            $"{batch.BatchNo}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            batch.Items.Count);
    }

    private static void BuildSummarySheet(XLWorkbook wb, Hrms.Domain.Entities.ExpenseBillingBatch batch)
    {
        var ws = wb.Worksheets.Add("Summary");
        var rows = new (string Label, object? Value)[]
        {
            ("Batch no", batch.BatchNo),
            ("Period from", batch.PeriodFrom.ToDateTime(TimeOnly.MinValue)),
            ("Period to", batch.PeriodTo.ToDateTime(TimeOnly.MinValue)),
            ("Status", batch.Status.ToString()),
            ("Total claims", batch.TotalClaims),
            ("Total amount", batch.TotalAmount),
            ("Exported at", DateTime.UtcNow.AddHours(7)),
            ("Created by", $"{batch.CreatedByEmployee.FirstName} {batch.CreatedByEmployee.LastName}".Trim()),
            ("Created at", batch.CreatedAt),
            ("Note", batch.Note ?? "")
        };

        ws.Cell(1, 1).Value = "Expense Billing Batch";
        ws.Range(1, 1, 1, 2).Merge().Style
            .Font.SetBold(true)
            .Font.SetFontSize(14);

        for (var i = 0; i < rows.Length; i++)
        {
            ws.Cell(i + 3, 1).Value = rows[i].Label;
            ws.Cell(i + 3, 2).Value = XLCellValue.FromObject(rows[i].Value);
            ws.Cell(i + 3, 1).Style.Font.SetBold(true);
        }

        ws.Column(2).Style.DateFormat.Format = "dd/mm/yyyy hh:mm:ss";
        ws.Column(2).Style.NumberFormat.Format = "#,##0.00";
        ws.Columns().AdjustToContents();
    }

    private static void BuildClaimsSheet(XLWorkbook wb, Hrms.Domain.Entities.ExpenseBillingBatch batch)
    {
        var ws = wb.Worksheets.Add("Claims");
        var headers = new[]
        {
            "เลขรายการ", "วันที่เอกสาร", "วันที่ส่ง", "พนักงาน", "ประเภท", "สถานะ",
            "ร้านค้า/ปั๊ม", "เลขที่บิล", "TID", "BATCH", "MID", "TRACE", "ยอดเงิน", "จำนวนลิตร", "เบอร์รถ", "ทะเบียนรถ",
            "เลขที่ใบขนส่ง", "ต้นทาง", "ลูกค้า", "จำนวนเที่ยว", "หมายเหตุ",
            "จำนวนไฟล์แนบ", "ไฟล์แนบ"
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
        foreach (var item in batch.Items.OrderBy(x => x.ExpenseClaim.ExpenseDate).ThenBy(x => x.ExpenseClaim.CreatedAt))
        {
            var claim = item.ExpenseClaim;
            var attachmentUrls = ParseAttachmentUrls(claim.AttachmentUrlsJson);

            ws.Cell(rowIndex, 1).Value = claim.Id.ToString();
            ws.Cell(rowIndex, 2).Value = claim.ExpenseDate.ToDateTime(TimeOnly.MinValue);
            ws.Cell(rowIndex, 3).Value = claim.CreatedAt;
            ws.Cell(rowIndex, 4).Value = $"{claim.Employee.FirstName} {claim.Employee.LastName}".Trim();
            ws.Cell(rowIndex, 5).Value = claim.Type.ToString();
            ws.Cell(rowIndex, 6).Value = claim.Status.ToString();
            ws.Cell(rowIndex, 7).Value = claim.MerchantName ?? "";
            ws.Cell(rowIndex, 8).Value = claim.BillNo ?? "";
            ws.Cell(rowIndex, 9).Value = claim.ReceiptTid ?? "";
            ws.Cell(rowIndex, 10).Value = claim.ReceiptBatch ?? "";
            ws.Cell(rowIndex, 11).Value = claim.ReceiptMid ?? "";
            ws.Cell(rowIndex, 12).Value = claim.ReceiptTrace ?? "";
            ws.Cell(rowIndex, 13).Value = claim.Amount;
            ws.Cell(rowIndex, 14).Value = claim.FuelLiters;
            ws.Cell(rowIndex, 15).Value = claim.VehicleNo ?? "";
            ws.Cell(rowIndex, 16).Value = claim.PlateNo ?? "";
            ws.Cell(rowIndex, 17).Value = claim.TransportNo ?? "";
            ws.Cell(rowIndex, 18).Value = claim.Origin ?? "";
            ws.Cell(rowIndex, 19).Value = claim.CustomerName ?? "";
            ws.Cell(rowIndex, 20).Value = claim.TripCount;
            ws.Cell(rowIndex, 21).Value = claim.Note ?? "";
            ws.Cell(rowIndex, 22).Value = attachmentUrls.Count;
            ws.Cell(rowIndex, 23).Value = string.Join(Environment.NewLine, attachmentUrls);
            ws.Cell(rowIndex, 23).Style.Alignment.SetWrapText(true);

            if (rowIndex % 2 == 0)
                ws.Range(rowIndex, 1, rowIndex, headers.Length)
                    .Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F5F5F5"));

            rowIndex++;
        }

        ws.Column(2).Style.DateFormat.Format = "dd/mm/yyyy";
        ws.Column(3).Style.DateFormat.Format = "dd/mm/yyyy hh:mm:ss";
        ws.Column(13).Style.NumberFormat.Format = "#,##0.00";
        ws.Column(14).Style.NumberFormat.Format = "#,##0.00";
        ws.Range(1, 1, Math.Max(1, rowIndex - 1), headers.Length).SetAutoFilter();
        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();
    }

    private static IReadOnlyList<string> ParseAttachmentUrls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return [json];

            var urls = new List<string>();
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var url = item.GetString();
                    if (!string.IsNullOrWhiteSpace(url)) urls.Add(url);
                }
                else if (item.ValueKind == JsonValueKind.Object
                    && (item.TryGetProperty("url", out var urlProperty) || item.TryGetProperty("Url", out urlProperty)))
                {
                    var url = urlProperty.GetString();
                    if (!string.IsNullOrWhiteSpace(url)) urls.Add(url);
                }
            }

            return urls;
        }
        catch
        {
            return [json];
        }
    }
}
