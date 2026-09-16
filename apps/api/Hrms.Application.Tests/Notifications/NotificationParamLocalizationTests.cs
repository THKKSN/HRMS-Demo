using FluentAssertions;
using Hrms.Application.Common.Localization;
using Hrms.Application.Common.Notifications;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// ตัวแปรที่ต้องเปลี่ยนตามภาษาผู้รับ (แผน notification-i18n งาน N2.4) มี 2 แบบ
/// — ป้าย enum ที่เป็นคีย์ในแคตตาล็อก และชื่อ master data ที่ HR กรอกไว้หลายภาษา
/// </summary>
public sealed class NotificationParamLocalizationTests
{
    /// <summary>คำที่ไม่ได้มาจาก DB (ความเร่งด่วน, ผลการกระจายงาน) เก็บเป็นคีย์ แล้วแปลตอนส่ง</summary>
    [Theory]
    [InlineData("th", "ด่วนมาก")]
    [InlineData("en", "Critical")]
    public void EnumParamIsResolvedFromTheCatalogInTheRecipientLanguage(string locale, string expected)
    {
        var payload = NotificationPayload.FromTemplate(
            "ticket.created.toManager", new { priority = "#enum.priority.Critical" });

        var resolved = payload.ResolveParams(locale, key => Catalog(locale).GetValueOrDefault(key));

        resolved["priority"].Should().Be(expected);
    }

    /// <summary>คีย์ที่ยังไม่มีคำแปลต้องโชว์ชื่อคีย์ให้เห็นว่าอะไรขาด ไม่ใช่ปล่อยว่าง (ว่างแล้วบรรทัดจะหายทั้งบรรทัด)</summary>
    [Fact]
    public void MissingEnumKeyShowsTheKeyInsteadOfDisappearing()
    {
        var payload = NotificationPayload.FromTemplate("x", new { priority = "#enum.priority.Unknown" });

        payload.ResolveParams("th", _ => null)["priority"].Should().Be("enum.priority.Unknown");
    }

    /// <summary>ค่าปกติที่ไม่ได้ขึ้นต้นด้วย # ต้องผ่านไปตรง ๆ — รวมถึงข้อความที่ผู้ใช้พิมพ์เอง</summary>
    [Fact]
    public void PlainParamsPassThroughUntouched()
    {
        var payload = NotificationPayload.FromTemplate(
            "x", new { ticketNo = "TK-0042", comment = "ห้อง 3 ยังร้อนอยู่" });

        var resolved = payload.ResolveParams("en", _ => "ไม่ควรถูกเรียก");

        resolved["ticketNo"].Should().Be("TK-0042");
        resolved["comment"].Should().Be("ห้อง 3 ยังร้อนอยู่");
    }

    [Theory]
    [InlineData("th", "ซ่อมบำรุง")]
    [InlineData("en", "Maintenance")]
    [InlineData("id", "Pemeliharaan")]
    public void MasterDataNameFollowsTheRecipientLanguage(string locale, string expected)
    {
        var payload = NotificationPayload.FromTemplate("x", null, new()
        {
            ["department"] = LocalizedName.AllLocales("ซ่อมบำรุง", "Maintenance", "Pemeliharaan"),
        });

        payload.ResolveParams(locale, _ => null)["department"].Should().Be(expected);
    }

    /// <summary>HR ยังไม่กรอกชื่ออังกฤษ → ต้องได้ชื่อไทยกลับไป ไม่ใช่ช่องว่าง (fallback เดียวกับฝั่งหน้าจอ)</summary>
    [Fact]
    public void MasterDataFallsBackWhenTheTranslationIsMissing()
    {
        var payload = NotificationPayload.FromTemplate("x", null, new()
        {
            ["department"] = LocalizedName.AllLocales("ซ่อมบำรุง", nameEn: null, nameId: null),
        });

        payload.ResolveParams("en", _ => null)["department"].Should().Be("ซ่อมบำรุง");
        payload.ResolveParams("id", _ => null)["department"].Should().Be("ซ่อมบำรุง");
    }

    /// <summary>row เก่าที่เก็บไว้ตอนยังไม่มีภาษานั้นในชุด — en ก่อน th ตาม D5 ห้ามคืนค่าว่าง</summary>
    [Fact]
    public void LocaleMissingFromTheStoredSetFallsBackToEnglishThenThai()
    {
        var payload = NotificationPayload.FromTemplate("x", null, new()
        {
            ["department"] = new() { ["th"] = "ซ่อมบำรุง", ["en"] = "Maintenance" },
            ["taxonomy"] = new() { ["th"] = "งานอาคาร" },
        });

        var resolved = payload.ResolveParams("id", _ => null);

        resolved["department"].Should().Be("Maintenance");
        resolved["taxonomy"].Should().Be("งานอาคาร");
    }

    /// <summary>payload ต้องเดินทางผ่าน JSON ได้ — นี่คือสิ่งที่เก็บจริงในคอลัมน์ payload_json</summary>
    [Fact]
    public void LocalizedParamsSurviveTheRoundTripThroughJson()
    {
        var json = NotificationPayload.FromTemplate(
            "ticket.created.toManager",
            new { ticketNo = "TK-1", priority = "#enum.priority.Low" },
            new() { ["department"] = LocalizedName.AllLocales("ซ่อมบำรุง", "Maintenance", null) })
            .ToJson();

        var payload = NotificationPayload.FromJson(json);

        payload.Should().NotBeNull();
        var resolved = payload!.ResolveParams("en", key => Catalog("en").GetValueOrDefault(key));
        resolved["ticketNo"].Should().Be("TK-1");
        resolved["priority"].Should().Be("Normal");
        resolved["department"].Should().Be("Maintenance");
    }

    private static Dictionary<string, string> Catalog(string locale) => locale switch
    {
        "en" => new() { ["enum.priority.Critical"] = "Critical", ["enum.priority.Low"] = "Normal" },
        _ => new() { ["enum.priority.Critical"] = "ด่วนมาก", ["enum.priority.Low"] = "ปกติ" },
    };
}
