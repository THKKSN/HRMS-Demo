using System.Text.Json;
using ClosedXML.Excel;
using FluentValidation;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class ExportExpenseClaimsExcelHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ExportExpenseClaimsQuery, ExpenseClaimsExportResult>
{
    public async Task<ExpenseClaimsExportResult> Handle(ExportExpenseClaimsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:view-all", ct);
        await currentUser.ThrowIfNoPermissionAsync(permService, "expense:export", ct);

        if (!request.Format.Equals("xlsx", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("รองรับเฉพาะ export format xlsx");

        if (request.DateFrom.HasValue && request.DateTo.HasValue && request.DateTo.Value < request.DateFrom.Value)
            throw new ValidationException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");

        var query = db.ExpenseClaims
            .AsNoTracking()
            .Include(x => x.Employee)
            .AsQueryable();

        var status = request.Status ?? Hrms.Domain.Enums.ExpenseClaimStatus.Approved;
        query = query.Where(x => x.Status == status);

        if (request.Type.HasValue)
            query = query.Where(x => x.Type == request.Type.Value);

        if (request.EmployeeId.HasValue)
            query = query.Where(x => x.EmployeeId == request.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(request.EmployeeSearch))
        {
            var search = request.EmployeeSearch.Trim();
            query = query.Where(x =>
                x.Employee.EmployeeCode.Contains(search) ||
                x.Employee.FirstName.Contains(search) ||
                x.Employee.LastName.Contains(search));
        }

        if (request.DateFrom.HasValue)
            query = query.Where(x => x.ExpenseDate >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(x => x.ExpenseDate <= request.DateTo.Value);

        var rows = await query
            .OrderByDescending(x => x.ExpenseDate)
            .ThenByDescending(x => x.CreatedAt)
            .Take(50_000)
            .Select(x => new
            {
                x.Id,
                x.ExpenseDate,
                x.CreatedAt,
                EmployeeName = x.Employee.FirstName + " " + x.Employee.LastName,
                x.Type,
                x.Status,
                x.MerchantName,
                x.BillNo,
                x.ReceiptTid,
                x.ReceiptBatch,
                x.ReceiptMid,
                x.ReceiptTrace,
                x.Amount,
                x.FuelLiters,
                x.VehicleNo,
                x.PlateNo,
                x.TransportNo,
                x.Origin,
                x.CustomerName,
                x.TripCount,
                x.Note,
                x.AttachmentUrlsJson
            })
            .ToListAsync(ct);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Expense Claims");
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
        foreach (var row in rows)
        {
            var attachmentUrls = ParseAttachmentUrls(row.AttachmentUrlsJson);

            ws.Cell(rowIndex, 1).Value = row.Id.ToString();
            ws.Cell(rowIndex, 2).Value = row.ExpenseDate.ToDateTime(TimeOnly.MinValue);
            ws.Cell(rowIndex, 3).Value = row.CreatedAt;
            ws.Cell(rowIndex, 4).Value = row.EmployeeName.Trim();
            ws.Cell(rowIndex, 5).Value = row.Type.ToString();
            ws.Cell(rowIndex, 6).Value = row.Status.ToString();
            ws.Cell(rowIndex, 7).Value = row.MerchantName ?? "";
            ws.Cell(rowIndex, 8).Value = row.BillNo ?? "";
            ws.Cell(rowIndex, 9).Value = row.ReceiptTid ?? "";
            ws.Cell(rowIndex, 10).Value = row.ReceiptBatch ?? "";
            ws.Cell(rowIndex, 11).Value = row.ReceiptMid ?? "";
            ws.Cell(rowIndex, 12).Value = row.ReceiptTrace ?? "";
            ws.Cell(rowIndex, 13).Value = row.Amount;
            ws.Cell(rowIndex, 14).Value = row.FuelLiters;
            ws.Cell(rowIndex, 15).Value = row.VehicleNo ?? "";
            ws.Cell(rowIndex, 16).Value = row.PlateNo ?? "";
            ws.Cell(rowIndex, 17).Value = row.TransportNo ?? "";
            ws.Cell(rowIndex, 18).Value = row.Origin ?? "";
            ws.Cell(rowIndex, 19).Value = row.CustomerName ?? "";
            ws.Cell(rowIndex, 20).Value = row.TripCount;
            ws.Cell(rowIndex, 21).Value = row.Note ?? "";
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

        using var ms = new MemoryStream();
        wb.SaveAs(ms);

        var now = DateTime.UtcNow.AddHours(7);
        await auditLog.LogAsync(
            "expense",
            "ExpenseClaim",
            now.ToString("yyyyMMddHHmmss"),
            "export-expense-claims",
            $"ส่งออกรายการวางบิลจำนวน {rows.Count} รายการ",
            null,
            new { request.Status, request.Type, request.EmployeeId, request.EmployeeSearch, request.DateFrom, request.DateTo, RowCount = rows.Count },
            ct);

        return new ExpenseClaimsExportResult(
            ms.ToArray(),
            $"expense-claims-{status.ToString().ToLowerInvariant()}-{now:yyyyMMdd-HHmmss}.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            rows.Count);
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
