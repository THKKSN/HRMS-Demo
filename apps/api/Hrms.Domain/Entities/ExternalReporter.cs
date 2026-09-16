using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExternalReporter : BaseEntity
{
    public string LineUserId { get; set; } = string.Empty;
    public string LineDisplayName { get; set; } = string.Empty;
    public string? PictureUrl { get; set; }
    public string? FullName { get; set; }
    /// <summary>เบอร์ติดต่อรูปแบบ E.164 (เช่น +66812345678) — ดู docs/external-reporter-phone-e164-plan.md</summary>
    public string? Phone { get; set; }
    /// <summary>ประเทศของเบอร์โทร ISO 3166-1 alpha-2 (เช่น TH) — null คือข้อมูลเก่าที่ยังไม่รู้ประเทศ</summary>
    public string? PhoneCountry { get; set; }
    public string? Email { get; set; }
    public string? Organization { get; set; }
    public string? PrivacyNoticeVersion { get; set; }
    /// <summary>
    /// ภาษาล่าสุดที่ผู้แจ้งใช้งานหน้าจอ (header <c>X-Locale</c>) — กลุ่มนี้มีโอกาสไม่ใช่คนไทยมากที่สุด
    /// จึงต้องเก็บเหมือน <see cref="Employee.PreferredLanguage"/> ดู docs/notification-i18n-plan.md ข้อ D11
    /// </summary>
    public string PreferredLanguage { get; set; } = "th";
    public DateTime? ConsentedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}
