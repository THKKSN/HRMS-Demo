using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Notifications;

namespace Hrms.Application.Common.Localization;

/// <summary>
/// ตัวแปลข้อความที่ <b>ผูกภาษาของผู้รับไว้แล้ว</b> — จุดเรียกส่งแค่คีย์กับตัวแปร ไม่ต้องรู้เรื่องภาษา
///
/// <para>
/// มีไว้เพราะเส้นทาง LINE มีทั้งการ์ดที่ประกอบใน <c>LineFlexBuilder</c>, job ที่วนส่งหลายคน
/// และ webhook ที่ตอบกลับคนที่ทัก — ทุกที่ต้องการ "คีย์ → ข้อความในภาษาของคนตรงหน้า" เหมือนกันหมด
/// </para>
/// </summary>
public sealed class MessageText(INotificationTemplateCatalog catalog, string locale)
{
    public string Locale { get; } = locale;

    /// <summary>
    /// คีย์ที่หาไม่เจอคืน<b>ชื่อคีย์</b>ออกไป ไม่ใช่สตริงว่าง — เห็นบนหน้าจอทันทีว่าคีย์ไหนขาด
    /// (ถ้าคืนค่าว่าง ข้อความจะหายเงียบ ๆ ตามกติกาตัดบรรทัด แล้วไม่มีใครรู้)
    /// </summary>
    public string Of(string key, object? parameters = null)
    {
        var template = catalog.Find(key, Locale) ?? key;
        return parameters is null
            ? template
            : NotificationTemplate.Render(template, NotificationTemplate.ToParams(parameters));
    }
}
