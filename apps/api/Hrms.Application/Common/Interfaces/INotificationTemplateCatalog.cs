namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// คลังข้อความ notification แยกตามภาษา — อ่านจาก <c>packages/i18n/messages/&lt;locale&gt;/notifications.json</c>
/// ซึ่งเป็นไฟล์ชุดเดียวกับที่ frontend ใช้ (แผน notification-i18n · D10)
/// </summary>
public interface INotificationTemplateCatalog
{
    /// <summary>
    /// หาเทมเพลตของ key ในภาษาที่ขอ · ไม่เจอให้ตกไปภาษา fallback · ไม่เจออีกคืน <c>null</c>
    /// ให้ผู้เรียกตัดสินใจเองว่าจะแสดงอะไรแทน (ห้ามโยน exception — คิวจะค้างทั้งก้อน)
    /// </summary>
    string? Find(string templateKey, string locale);
}
