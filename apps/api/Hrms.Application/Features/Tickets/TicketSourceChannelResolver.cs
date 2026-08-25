using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets;

/// <summary>
/// แปลงชื่อแอป client (header X-Client-App) เป็นช่องทางที่เก็บลง tickets.source_channel
/// ค่าที่ไม่รู้จักหรือไม่ส่งมาให้เป็น Unknown เพื่อไม่ให้การเปิดเรื่องล้มเหลว
/// </summary>
public static class TicketSourceChannelResolver
{
    public const int ClientAppMaxLength = 50;

    public static TicketSourceChannel FromClientApp(string? clientApp) => Normalize(clientApp) switch
    {
        "liff-web" or "liff" => TicketSourceChannel.LineLiff,
        "admin-web" or "web-portal" => TicketSourceChannel.WebPortal,
        "external-portal" => TicketSourceChannel.ExternalPortal,
        _ => TicketSourceChannel.Unknown
    };

    /// <summary>ค่าดิบที่เก็บไว้ debug/ดูแอปรุ่นใหม่ที่ยังไม่ได้ map — ตัดความยาวตาม column</summary>
    public static string? NormalizeClientApp(string? clientApp)
    {
        var value = Normalize(clientApp);
        if (value is null) return null;
        return value.Length <= ClientAppMaxLength ? value : value[..ClientAppMaxLength];
    }

    private static string? Normalize(string? clientApp)
        => string.IsNullOrWhiteSpace(clientApp) ? null : clientApp.Trim().ToLowerInvariant();
}
