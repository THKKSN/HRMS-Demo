using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Services;
using Xunit;

namespace Hrms.Application.Tests.Memos;

public class QuestPdfMemoGeneratorTests
{
    public QuestPdfMemoGeneratorTests()
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    [Fact]
    public void Generate_ValidData_ReturnsNonEmptyPdfBytes()
    {
        var generator = new QuestPdfMemoGenerator();
        var data = new MemoPrintData(
            Id: Guid.NewGuid(),
            MemoNo: "Memo-20260828-0001",
            MemoTypeName: "ขอซื้ออุปกรณ์",
            CategoryName: "คอมพิวเตอร์",
            SubCategoryName: "อุปกรณ์ต่อพ่วง",
            Detail: "ขอซื้อเมาส์และคีย์บอร์ดสำรอง",
            RequesterName: "ทดสอบ ระบบ",
            CompanyName: "บริษัททดสอบ",
            DepartmentName: "แผนกไอที",
            CreatedAt: DateTime.UtcNow.AddHours(7).AddDays(-1),
            ApprovedAt: DateTime.UtcNow.AddHours(7),
            ApprovedByName: "ผู้บริหาร ทดสอบ");

        var pdfBytes = generator.Generate(data);

        Assert.NotEmpty(pdfBytes);
        // PDF file signature: "%PDF-"
        Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(pdfBytes, 0, 5));
    }
}
