using FluentAssertions;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ผู้รับแต่ละคนต้องได้ภาษาของตัวเอง ไม่ใช่ภาษาของคนที่กดปุ่ม (แผน notification-i18n งาน N2)
/// </summary>
public sealed class RecipientLocaleResolverTests
{
    [Fact]
    public async Task ResolvesEmployeeLanguageFromTheRecipientNotTheActor()
    {
        await using var db = CreateDb();
        var thai = Recipient("E-TH", "th");
        var english = Recipient("E-EN", "en");
        db.Employees.AddRange(thai, english);
        await db.SaveChangesAsync();
        var resolver = new RecipientLocaleResolver(db);

        (await resolver.ResolveAsync(ToEmployee(thai))).Should().Be("th");
        (await resolver.ResolveAsync(ToEmployee(english))).Should().Be("en");
    }

    /// <summary>
    /// <c>RecipientEmployeeId == null</c> คือผู้แจ้งภายนอก — ต้องไปหาที่ตาราง external_reporters
    /// ด้วย LINE user id เพราะ outbox ไม่ได้เก็บ id ของกลุ่มนี้ไว้
    /// </summary>
    [Fact]
    public async Task ResolvesExternalReporterLanguageByLineUserId()
    {
        await using var db = CreateDb();
        db.ExternalReporters.Add(new ExternalReporter
        {
            Id = Guid.NewGuid(),
            LineUserId = "U-external",
            LineDisplayName = "ผู้แจ้งภายนอก",
            PreferredLanguage = "en",
        });
        await db.SaveChangesAsync();
        var resolver = new RecipientLocaleResolver(db);

        var locale = await resolver.ResolveAsync(new NotificationOutbox
        {
            RecipientEmployeeId = null,
            LineUserId = "U-external",
        });

        locale.Should().Be("en");
    }

    /// <summary>ผู้ใช้ที่เลือกอินโดฯ ยังไม่มีไฟล์คำแปล notification — ต้องได้อังกฤษ ไม่ใช่ไทย (D5)</summary>
    [Fact]
    public async Task IndonesianRecipientGetsEnglishNotThai()
    {
        await using var db = CreateDb();
        var employee = Recipient("E-ID", "id");
        db.Employees.Add(employee);
        await db.SaveChangesAsync();

        var locale = await new RecipientLocaleResolver(db).ResolveAsync(ToEmployee(employee));

        locale.Should().Be("en");
    }

    /// <summary>หาแถวผู้รับไม่เจอก็ยังต้องส่งออกได้ — ตกเป็นไทยเหมือนพฤติกรรมก่อน N2</summary>
    [Fact]
    public async Task UnknownRecipientFallsBackToThai()
    {
        await using var db = CreateDb();

        var locale = await new RecipientLocaleResolver(db).ResolveAsync(new NotificationOutbox
        {
            RecipientEmployeeId = Guid.NewGuid(),
            LineUserId = "U-missing",
        });

        locale.Should().Be("th");
    }

    /// <summary>คิวรอบเดียวมักมีหลายแถวของคนเดิม — ถามซ้ำต้องไม่ยิง query ใหม่</summary>
    [Fact]
    public async Task RemembersTheAnswerWithinOneRun()
    {
        await using var db = CreateDb();
        var employee = Recipient("E-CACHE", "en");
        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        var resolver = new RecipientLocaleResolver(db);
        var delivery = ToEmployee(employee);

        (await resolver.ResolveAsync(delivery)).Should().Be("en");

        // แก้ค่าใน DB แล้วถามซ้ำ — ยังต้องได้ค่าเดิมของรอบนี้ แปลว่าไม่ได้ไปอ่าน DB ใหม่
        await db.Employees.Where(x => x.Id == employee.Id)
            .ForEachAsync(x => x.PreferredLanguage = "th");
        await db.SaveChangesAsync();

        (await resolver.ResolveAsync(delivery)).Should().Be("en");
    }

    private static NotificationOutbox ToEmployee(Employee employee) => new()
    {
        RecipientEmployeeId = employee.Id,
        LineUserId = employee.LineUserId ?? string.Empty,
    };

    private static Employee Recipient(string code, string preferredLanguage) => new()
    {
        Id = Guid.NewGuid(),
        CompanyId = Guid.NewGuid(),
        EmployeeCode = code,
        FirstName = "ผู้รับ",
        LastName = code,
        LineUserId = $"U-{code}",
        PreferredLanguage = preferredLanguage,
    };

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"recipient-locale-{Guid.NewGuid():N}")
            .Options;
        return new HrmsDbContext(options);
    }
}
