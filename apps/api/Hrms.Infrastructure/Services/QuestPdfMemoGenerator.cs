using Hrms.Application.Common.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Hrms.Infrastructure.Services;

public class QuestPdfMemoGenerator : IMemoPdfGenerator
{
    public byte[] Generate(MemoPrintData data)
    {
        var labelStyle = TextStyle.Default.Bold();
        var borderColor = Colors.Grey.Darken1;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2.2f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(12).FontColor(Colors.Black));

                page.Header().Column(col =>
                {
                    col.Item().AlignCenter().Text("Memo").FontSize(20).Bold();
                    col.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor(borderColor);
                });

                page.Content().PaddingVertical(12).Column(col =>
                {
                    col.Spacing(6);

                    // ── กล่องข้อมูลหัวเรื่อง ──────────────────────────
                    col.Item().Border(1).BorderColor(borderColor).Padding(10).Column(box =>
                    {
                        box.Spacing(6);

                        box.Item().Row(row =>
                        {
                            row.RelativeItem(3).Text(text =>
                            {
                                text.Span("เลขที่: ").Style(labelStyle);
                                text.Span(data.MemoNo);
                            });
                            row.RelativeItem(2).Text(text =>
                            {
                                text.Span("วันที่: ").Style(labelStyle);
                                text.Span(data.CreatedAt.ToString("dd/MM/yyyy"));
                            });
                        });

                        box.Item().Row(row =>
                        {
                            row.RelativeItem(3).Text(text =>
                            {
                                text.Span("เรื่อง: ").Style(labelStyle);
                                text.Span($"{data.MemoTypeName} / {data.CategoryName} / {data.SubCategoryName}");
                            });
                        });

                        box.Item().Text(text =>
                        {
                            text.Span("ผู้ขอ: ").Style(labelStyle);
                            text.Span(data.RequesterName);
                        });

                        box.Item().Text(text =>
                        {
                            text.Span("บริษัท/แผนก: ").Style(labelStyle);
                                text.Span($"{data.CompanyName} / {data.DepartmentName}");
                        });

                        box.Item().Text(text =>
                        {
                            text.Span("เรียน: ").Style(labelStyle);
                                text.Span("คณะผู้บริหาร");
                        });
                    });

                    // ── เนื้อหา ──────────────────────────────────────
                    col.Item().PaddingTop(14).Text("รายละเอียด/หมายเหตุ").Bold();
                    col.Item().PaddingTop(2).PaddingLeft(10).Text(data.Detail).LineHeight(1.4f);

                    // ── ลงนามผู้ขอ / ผู้อนุมัติ ───────────────────────
                    col.Item().PaddingTop(50).Row(row =>
                    {
                        row.RelativeItem().Column(sig =>
                        {
                            sig.Item().AlignCenter().Width(220).Column(inner =>
                            {
                                inner.Item().BorderBottom(1).BorderColor(borderColor).Height(30);
                                inner.Item().PaddingTop(6).AlignCenter().Text(data.RequesterName);
                                inner.Item().AlignCenter().Text("ผู้ยื่นเรื่อง").FontSize(10);
                                inner.Item().AlignCenter().Text(data.CreatedAt.ToString("dd/MM/yyyy")).FontSize(9);
                            });
                        });

                        row.RelativeItem().Column(sig =>
                        {
                            sig.Item().AlignCenter().Width(220).Column(inner =>
                            {
                                inner.Item().BorderBottom(1).BorderColor(borderColor).Height(30);
                                inner.Item().PaddingTop(6).AlignCenter().Text(data.ApprovedByName);
                                inner.Item().AlignCenter().Text("ผู้อนุมัติ").FontSize(10);
                                inner.Item().AlignCenter().Text(data.ApprovedAt.ToString("dd/MM/yyyy")).FontSize(9);
                            });
                        });
                    });
                });
            });
        });

        // Title metadata = ชื่อที่ PDF viewer (Chrome ฯลฯ) แสดงเป็นชื่อเอกสาร/แท็บ
        // ถ้าไม่ตั้ง viewer จะ fallback ไปใช้ชื่อจาก URL ซึ่งเป็น UUID ของ blob
        document.WithMetadata(new DocumentMetadata { Title = data.MemoNo });

        return document.GeneratePdf();
    }
}
