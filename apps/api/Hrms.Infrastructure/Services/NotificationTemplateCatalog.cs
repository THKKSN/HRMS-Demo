using System.Collections.Concurrent;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// อ่าน <c>notifications.json</c> ของแต่ละภาษาจากโฟลเดอร์ <c>i18n/&lt;locale&gt;/</c> ข้าง ๆ ไฟล์ที่รัน
///
/// <para>
/// ไฟล์ต้นทางคือ <c>packages/i18n/messages/&lt;locale&gt;/notifications.json</c> — ชุดเดียวกับที่ frontend ใช้
/// (D10) · <c>Hrms.Api.csproj</c> ลิงก์เข้ามาเป็น <c>Content</c> จึงตามไปกับ publish output เอง
/// </para>
/// <para>
/// โหลดครั้งเดียวแล้วแคชไว้ · ไฟล์หายหรือ JSON พังต้องไม่ทำให้ job ล้ม — คืน <c>null</c>
/// แล้วปล่อยให้ผู้เรียกใช้ทางหนีทีไล่ ไม่งั้น notification ทั้งคิวส่งไม่ออก
/// </para>
/// </summary>
public sealed class NotificationTemplateCatalog(
    ILogger<NotificationTemplateCatalog> logger,
    string? rootDirectory = null) : INotificationTemplateCatalog
{
    /// <summary>
    /// ลำดับภาษาสำรองเมื่อภาษาที่ขอไม่มีไฟล์หรือไม่มีคีย์นั้น — <b>en ก่อน th</b> ตาม D5
    /// (คนที่ตั้งภาษาอื่นมีโอกาสอ่านอังกฤษออกมากกว่าไทย) · th ปิดท้ายเพราะเป็นภาษาเดียวที่แปลครบแน่นอน
    /// </summary>
    public static readonly IReadOnlyList<string> FallbackLocales = ["en", "th"];

    private readonly string _root = rootDirectory
        ?? Path.Combine(AppContext.BaseDirectory, "i18n");

    private readonly ConcurrentDictionary<string, IReadOnlyDictionary<string, string>> _cache = new(StringComparer.OrdinalIgnoreCase);

    public string? Find(string templateKey, string locale)
    {
        if (string.IsNullOrWhiteSpace(templateKey)) return null;
        if (!string.IsNullOrWhiteSpace(locale) && Load(locale).TryGetValue(templateKey, out var template))
            return template;

        foreach (var fallback in FallbackLocales)
        {
            if (string.Equals(fallback, locale, StringComparison.OrdinalIgnoreCase)) continue;
            if (Load(fallback).TryGetValue(templateKey, out var value)) return value;
        }
        return null;
    }

    private IReadOnlyDictionary<string, string> Load(string locale)
        => _cache.GetOrAdd(locale, key =>
        {
            var path = Path.Combine(_root, key, "notifications.json");
            try
            {
                if (!File.Exists(path))
                {
                    logger.LogWarning("Notification template catalog not found at {Path}", path);
                    return new Dictionary<string, string>(StringComparer.Ordinal);
                }
                using var document = JsonDocument.Parse(File.ReadAllText(path));
                var flat = new Dictionary<string, string>(StringComparer.Ordinal);
                Flatten(document.RootElement, prefix: string.Empty, flat);
                return flat;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to read notification template catalog at {Path}", path);
                return new Dictionary<string, string>(StringComparer.Ordinal);
            }
        });

    /// <summary>JSON ซ้อนชั้น → คีย์จุด (<c>{"ticket":{"created":"…"}}</c> → <c>ticket.created</c>)</summary>
    private static void Flatten(JsonElement element, string prefix, Dictionary<string, string> output)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            if (prefix.Length > 0 && element.ValueKind == JsonValueKind.String)
                output[prefix] = element.GetString() ?? string.Empty;
            return;
        }
        foreach (var property in element.EnumerateObject())
        {
            var key = prefix.Length == 0 ? property.Name : $"{prefix}.{property.Name}";
            Flatten(property.Value, key, output);
        }
    }
}
