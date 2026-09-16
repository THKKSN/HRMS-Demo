using FluentAssertions;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ลำดับภาษาสำรองของแคตตาล็อก: <b>ภาษาที่ขอ → en → th</b> (D5)
/// ใช้ไฟล์ชั่วคราวที่คุมเนื้อหาได้เอง ไม่ใช่ไฟล์จริงในเรโป — ผลลัพธ์จะได้ไม่เปลี่ยนตามงานแปลที่ยังทำอยู่
/// </summary>
public sealed class NotificationTemplateCatalogFallbackTests : IDisposable
{
    private readonly string _root = Path.Combine(
        Path.GetTempPath(), $"hrms-notifications-{Guid.NewGuid():N}");

    public NotificationTemplateCatalogFallbackTests()
    {
        Write("th", """{ "ticket": { "closed": { "all": "ไทย" }, "rejected": { "all": "เฉพาะไทย" } } }""");
        Write("en", """{ "ticket": { "closed": { "all": "English" } } }""");
    }

    [Fact]
    public void UsesTheRequestedLanguageWhenItHasTheKey()
    {
        Catalog().Find("ticket.closed.all", "en").Should().Be("English");
        Catalog().Find("ticket.closed.all", "th").Should().Be("ไทย");
    }

    /// <summary>
    /// ภาษาที่ยังไม่มีไฟล์คำแปล (เช่น <c>id</c>) ต้องตกที่ <b>en ก่อน th</b> —
    /// คนที่เลือกภาษาอื่นมีโอกาสอ่านอังกฤษออกมากกว่าไทย
    /// </summary>
    [Fact]
    public void LanguageWithoutACatalogFallsBackToEnglishBeforeThai()
        => Catalog().Find("ticket.closed.all", "id").Should().Be("English");

    /// <summary>คีย์ที่ยังไม่ได้แปลเป็นอังกฤษต้องได้ไทย ไม่ใช่ค่าว่าง — ส่งออกไปได้ก่อน แล้วค่อยตามแปล</summary>
    [Fact]
    public void KeyMissingFromEnglishFallsBackToThai()
        => Catalog().Find("ticket.rejected.all", "en").Should().Be("เฉพาะไทย");

    [Fact]
    public void UnknownKeyReturnsNullFromEveryLanguage()
        => Catalog().Find("ticket.doesNotExist.anywhere", "id").Should().BeNull();

    /// <summary>ภาษาว่าง (คิวเก่า/ข้อมูลพัง) ต้องไม่ระเบิด — ตกตามลำดับสำรองตามปกติ</summary>
    [Fact]
    public void EmptyLocaleStillResolves()
        => Catalog().Find("ticket.closed.all", "").Should().Be("English");

    private NotificationTemplateCatalog Catalog()
        => new(NullLogger<NotificationTemplateCatalog>.Instance, _root);

    private void Write(string locale, string json)
    {
        var directory = Path.Combine(_root, locale);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "notifications.json"), json);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
