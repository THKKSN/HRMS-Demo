using Hrms.Application.Common.Localization;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// กติกาเลือกภาษาฝั่ง API (แผน notification-i18n งาน N2.2) — ต้องตรงกับ
/// <c>packages/i18n/src/locales.ts</c> ฝั่ง frontend
/// </summary>
public class AppLocaleTests
{
    [Theory]
    [InlineData("th", "th")]
    [InlineData("en", "en")]
    [InlineData("id", "id")]
    [InlineData("TH", "th")]
    [InlineData("en-US", "en")]
    [InlineData("th_TH", "th")]
    [InlineData("  en  ", "en")]
    public void Normalize_KeepsSupportedLanguages(string header, string expected)
        => Assert.Equal(expected, AppLocale.Normalize(header));

    /// <summary>D5 — ภาษาที่ไม่รองรับตกเป็น en ไม่ใช่ th เพราะคนกลุ่มนี้มีโอกาสอ่านไทยไม่ออก</summary>
    [Theory]
    [InlineData("ja")]
    [InlineData("zh-Hant")]
    [InlineData("xx")]
    public void Normalize_FallsBackToEnglishForUnsupportedLanguages(string header)
        => Assert.Equal("en", AppLocale.Normalize(header));

    /// <summary>ไม่มี header = ไม่รู้ภาษา ต้องไม่ไปเขียนทับค่าที่เคยจำไว้</summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("-")]
    public void Normalize_ReturnsNullWhenThereIsNoUsableValue(string? header)
        => Assert.Null(AppLocale.Normalize(header));

    [Theory]
    [InlineData("th", "th")]
    [InlineData("en", "en")]
    [InlineData("en-GB", "en")]
    public void ForNotifications_UsesTheLanguageWhenThereIsACatalog(string stored, string expected)
        => Assert.Equal(expected, AppLocale.ForNotifications(stored));

    /// <summary>
    /// <c>id</c> เก็บลง DB ได้ (ผู้ใช้เลือกได้บนหน้าจอ) แต่ยังไม่มีไฟล์คำแปลของ notification
    /// จึงตกเป็น en ตอน render — ไม่ใช่ th
    /// </summary>
    [Fact]
    public void ForNotifications_MapsIndonesianToEnglishUntilItsCatalogExists()
        => Assert.Equal("en", AppLocale.ForNotifications("id"));

    /// <summary>แถวเก่าที่ยังไม่เคยยิง header มา ต้องได้ไทยเหมือนพฤติกรรมก่อน N2 ทุกประการ</summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void ForNotifications_FallsBackToThaiWhenNothingIsStored(string? stored)
        => Assert.Equal("th", AppLocale.ForNotifications(stored));
}
