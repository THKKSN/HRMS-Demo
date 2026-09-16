using System.Text.Json;
using System.Text.RegularExpressions;
using Hrms.Application.Common.Notifications;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

/// <summary>
/// คุมสัญญาของ payload รูปใหม่ <c>{ templateKey, params }</c> (แผน notification-i18n งาน N1)
/// </summary>
public class NotificationTemplateTests
{
    [Fact]
    public void Render_ReplacesNamedPlaceholders()
    {
        var text = NotificationTemplate.Render(
            "ใบแจ้งเรื่อง {ticketNo} ถูกปฏิเสธ",
            new Dictionary<string, string> { ["ticketNo"] = "TK-0042" });

        Assert.Equal("ใบแจ้งเรื่อง TK-0042 ถูกปฏิเสธ", text);
    }

    /// <summary>
    /// แทนของเดิมที่จุดเรียกเขียนว่า <c>reason is null ? "" : $"\nเหตุผล: {reason}"</c> —
    /// ถ้าปล่อยไว้แบบนั้นคำว่า "เหตุผล:" จะค้างอยู่ในโค้ด C# แล้วแปลไม่ได้
    /// </summary>
    [Fact]
    public void Render_DropsLineWhenItsPlaceholderIsEmpty()
    {
        const string template = "เรื่อง '{memoTitle}' ได้รับการอนุมัติแล้ว\nความเห็น: {comment}";

        var withComment = NotificationTemplate.Render(
            template,
            new Dictionary<string, string> { ["memoTitle"] = "ขอซื้อ", ["comment"] = "เร่งด่วน" });
        var withoutComment = NotificationTemplate.Render(
            template,
            new Dictionary<string, string> { ["memoTitle"] = "ขอซื้อ", ["comment"] = "" });

        Assert.Equal("เรื่อง 'ขอซื้อ' ได้รับการอนุมัติแล้ว\nความเห็น: เร่งด่วน", withComment);
        Assert.Equal("เรื่อง 'ขอซื้อ' ได้รับการอนุมัติแล้ว", withoutComment);
    }

    [Fact]
    public void Render_KeepsLineThatHasNoPlaceholder()
    {
        var text = NotificationTemplate.Render("บรรทัดคงที่\n{missing}", null);

        Assert.Equal("บรรทัดคงที่", text);
    }

    [Fact]
    public void ToParams_TurnsNullIntoEmptyString()
    {
        var parameters = NotificationTemplate.ToParams(new { reason = (string?)null, ticketNo = "TK-1" });

        Assert.NotNull(parameters);
        Assert.Equal(string.Empty, parameters!["reason"]);
        Assert.Equal("TK-1", parameters["ticketNo"]);
    }

    [Fact]
    public void Payload_RoundTripsTemplateAndParams()
    {
        var json = NotificationPayload.FromTemplate("ticket.closed.all", new { ticketNo = "TK-9" }).ToJson();

        var payload = NotificationPayload.FromJson(json);

        Assert.NotNull(payload);
        Assert.Equal("ticket.closed.all", payload!.TemplateKey);
        Assert.Equal("TK-9", payload.Params!["ticketNo"]);
    }

    /// <summary>
    /// คิวที่ค้างอยู่ตอน deploy ยังเป็นรูปเก่า <c>{"Message":"…"}</c> — ต้องอ่านได้ ไม่งั้นส่งไม่ออกทั้งก้อน
    /// </summary>
    [Fact]
    public void Payload_StillReadsOldMessageShape()
    {
        var payload = NotificationPayload.FromJson("{\"Message\":\"ข้อความเดิม\"}");

        Assert.NotNull(payload);
        Assert.Null(payload!.TemplateKey);
        Assert.Equal("ข้อความเดิม", payload.Message);
    }

    /// <summary>
    /// <b>ด่านสำคัญ:</b> ทุก templateKey ที่โค้ดส่ง ต้องมีอยู่จริงใน
    /// <c>packages/i18n/messages/th/notifications.json</c> — คีย์ผิดตัวอักษรเดียวผู้ใช้ก็ได้ข้อความเปล่า
    /// </summary>
    [Fact]
    public void EveryTemplateKeyUsedInCode_ExistsInThaiCatalog()
    {
        var root = FindRepositoryRoot();
        var catalog = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "th", "notifications.json"));

        var used = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var file in SourceFiles(root))
        {
            foreach (Match match in Regex.Matches(File.ReadAllText(file), KeyLiteralPattern))
                used.Add(match.Groups[1].Value);
        }

        Assert.NotEmpty(used);
        var missing = used.Where(key => !catalog.ContainsKey(key)).ToList();
        Assert.True(missing.Count == 0, $"templateKey ที่ยังไม่มีในแคตตาล็อก th: {string.Join(", ", missing)}");
    }

    /// <summary>
    /// คีย์ในแคตตาล็อกที่ไม่มีโค้ดไหนเรียก = ตกค้าง ควรลบทิ้งก่อนส่งไปแปล
    /// <para>ยกเว้นกลุ่ม <c>enum.*</c> ที่โค้ดประกอบคีย์จากค่า enum — มีเทสต์ของตัวเองด้านล่าง</para>
    /// </summary>
    [Fact]
    public void EveryTemplateInThaiCatalog_IsUsedByCode()
    {
        var root = FindRepositoryRoot();
        var catalog = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "th", "notifications.json"));

        var source = string.Concat(SourceFiles(root).Select(File.ReadAllText));

        var unused = catalog.Keys
            .Where(key => !key.StartsWith("enum.", StringComparison.Ordinal))
            .Where(key => !source.Contains($"\"{key}\"", StringComparison.Ordinal))
            .ToList();
        Assert.True(unused.Count == 0, $"คีย์ที่ไม่มีใครเรียกแล้ว: {string.Join(", ", unused)}");
    }

    /// <summary>
    /// คีย์กระจายอยู่ 2 โปรเจกต์: handler/การ์ดอยู่ที่ <c>Hrms.Application</c>
    /// ส่วน job กับ <c>LineMessagingService</c> อยู่ที่ <c>Hrms.Infrastructure</c>
    /// </summary>
    private static IEnumerable<string> SourceFiles(string root) =>
        new[] { "Hrms.Application", "Hrms.Infrastructure" }
            .Select(project => Path.Combine(root, "apps", "api", project))
            .SelectMany(directory => Directory.EnumerateFiles(directory, "*.cs", SearchOption.AllDirectories))
            // ไม่อ่านผลลัพธ์ build — ในนั้นมีไฟล์ที่ generate ซ้ำ ทำให้ผลไม่นิ่ง
            .Where(path => !path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                        && !path.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"));

    /// <summary>
    /// คีย์ที่โค้ดเขียนเป็น string literal · รวม <c>card.*</c> เพราะป้ายสถานะมาจาก
    /// <c>ResolveTicketStyle</c> ที่คืน "คีย์" ไม่ใช่ข้อความแล้ว
    /// </summary>
    private const string KeyLiteralPattern =
        "\"((?:ticket|memo|card|leave|attendance|webhook)\\.[A-Za-z]+(?:\\.[A-Za-z]+)?)\"";

    /// <summary>
    /// ป้าย enum ที่โค้ดอ้างเป็นคีย์ (<c>#enum.priority.Low</c>) ต้องมีครบทุกค่าของ enum ทั้งไทยและอังกฤษ —
    /// ค่าใหม่ที่เพิ่มใน enum แล้วลืมเติมคำแปล ผู้รับจะเห็นชื่อคีย์ดิบบนการ์ด LINE
    /// </summary>
    [Theory]
    [InlineData("th")]
    [InlineData("en")]
    public void EveryEnumValueUsedInMessages_HasALabel(string locale)
    {
        var catalog = LoadCatalog(Path.Combine(
            FindRepositoryRoot(), "packages", "i18n", "messages", locale, "notifications.json"));

        foreach (var value in Enum.GetNames<Hrms.Domain.Enums.TicketPriority>())
            Assert.True(catalog.ContainsKey($"enum.priority.{value}"), $"ขาด enum.priority.{value} ใน {locale}");
        foreach (var value in Enum.GetNames<Hrms.Domain.Enums.TicketRoutingOutcome>())
            Assert.True(catalog.ContainsKey($"enum.routing.{value}"), $"ขาด enum.routing.{value} ใน {locale}");
    }

    /// <summary>
    /// ความเร่งด่วนบนการ์ด LINE ต้องใช้คำเดียวกับที่ผู้ใช้เห็นบนหน้าจอ —
    /// ต้นทางคือ <c>messages/en/status.json</c> (<c>status.ticketPriority</c>) ตามกติกา "ป้าย enum ที่เดียว" ใน CLAUDE.md
    /// </summary>
    [Fact]
    public void EnglishPriorityLabels_MatchTheOnesShownInTheUi()
    {
        var root = FindRepositoryRoot();
        var notifications = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "en", "notifications.json"));
        var status = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "en", "status.json"));

        foreach (var value in Enum.GetNames<Hrms.Domain.Enums.TicketPriority>())
        {
            Assert.Equal(
                status[$"ticketPriority.{value}"],
                notifications[$"enum.priority.{value}"]);
        }
    }

    /// <summary>ภาษาอังกฤษต้องมีคีย์ครบเท่าไทย ไม่งั้นผู้รับที่ตั้ง en จะได้ข้อความไทยปนมาโดยไม่มีใครรู้</summary>
    [Fact]
    public void EnglishCatalog_HasEveryKeyTheThaiCatalogHas()
    {
        var root = FindRepositoryRoot();
        var thai = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "th", "notifications.json"));
        var english = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "en", "notifications.json"));

        Assert.Equal(thai.Keys.OrderBy(x => x, StringComparer.Ordinal), english.Keys.OrderBy(x => x, StringComparer.Ordinal));
    }

    /// <summary>
    /// ตัวแปรในเทมเพลตต้องตรงกันทุกภาษา — แปลแล้วสะกดชื่อตัวแปรผิดหรือตกไป
    /// ผู้รับจะเห็นช่องว่าง หรือบรรทัดนั้นหายไปเงียบ ๆ ตามกติกาตัดบรรทัด
    /// </summary>
    [Fact]
    public void EnglishCatalog_UsesTheSamePlaceholdersAsThai()
    {
        var root = FindRepositoryRoot();
        var thai = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "th", "notifications.json"));
        var english = LoadCatalog(Path.Combine(root, "packages", "i18n", "messages", "en", "notifications.json"));

        foreach (var (key, template) in thai)
        {
            Assert.Equal(Placeholders(template), Placeholders(english[key]));
        }
    }

    private static SortedSet<string> Placeholders(string template)
        => new(Regex.Matches(template, @"\{([A-Za-z][A-Za-z0-9]*)\}").Select(m => m.Groups[1].Value), StringComparer.Ordinal);

    private static Dictionary<string, string> LoadCatalog(string path)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var flat = new Dictionary<string, string>(StringComparer.Ordinal);
        Flatten(document.RootElement, string.Empty, flat);
        return flat;
    }

    private static void Flatten(JsonElement element, string prefix, Dictionary<string, string> output)
    {
        if (element.ValueKind == JsonValueKind.String)
        {
            output[prefix] = element.GetString() ?? string.Empty;
            return;
        }
        foreach (var property in element.EnumerateObject())
            Flatten(property.Value, prefix.Length == 0 ? property.Name : $"{prefix}.{property.Name}", output);
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (Directory.Exists(Path.Combine(directory.FullName, "packages", "i18n", "messages")))
                return directory.FullName;
            directory = directory.Parent;
        }
        throw new InvalidOperationException("หา repository root ไม่เจอ (ต้องมีโฟลเดอร์ packages/i18n/messages)");
    }
}
