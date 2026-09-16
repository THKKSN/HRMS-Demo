using Hrms.Application.Common.Localization;

namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// สร้าง <see cref="MessageText"/> ของผู้รับหนึ่งคน — ทางเข้าเดียวของทุกเส้นทางที่ส่งข้อความออก LINE
/// (job, การ์ด, webhook) สำหรับการหาว่า "คนนี้อ่านภาษาอะไร"
/// </summary>
public interface ILineMessageTextFactory
{
    /// <summary>ใช้เมื่อโหลดแถวผู้รับมาแล้ว — ไม่ต้องยิง query ซ้ำ</summary>
    MessageText For(string? preferredLanguage);

    /// <summary>ใช้เมื่อมีแค่ LINE user id (เช่น webhook ที่เพิ่งรับ event เข้ามา)</summary>
    Task<MessageText> ForLineUserAsync(string lineUserId, CancellationToken ct = default);
}
