namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// ส่งสัญญาณให้ระบบไปส่ง notification ที่ค้างอยู่ใน outbox ทันที
/// โดยไม่ต้องรอ recurring job รอบถัดไป
///
/// การเรียกซ้ำเป็นเรื่องปกติและปลอดภัย เพราะ NotificationDeliveryJob
/// claim แถวด้วย ExecuteUpdateAsync แบบ atomic อยู่แล้ว จึงไม่ส่งข้อความซ้ำ
/// </summary>
public interface INotificationDispatchSignal
{
    /// <summary>
    /// ต้องเรียก "หลัง" ข้อมูลถูก commit ลง database แล้วเท่านั้น
    /// ถ้าเรียกก่อน commit worker จะมองไม่เห็นแถวและได้ผลเป็นการรันเปล่า
    /// </summary>
    void RequestDispatch();
}
