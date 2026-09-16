namespace Hrms.Application.Features.LineWebhook;

/// <summary>
/// คำที่ผู้ใช้ "ส่งเข้ามา" เพื่อสั่งงาน — มาจากปุ่มบน rich menu ที่ตั้งค่าไว้ใน LINE console
/// และจาก quick reply ที่เราส่งออกไปเอง
///
/// <para>
/// <b>ห้ามแปล</b> — นี่คือ protocol ระหว่างปุ่มกับ webhook ไม่ใช่ข้อความที่อ่านเอาความหมาย
/// (ป้ายบนปุ่มที่ผู้ใช้เห็นเป็นคนละค่า และอยู่ในไฟล์คำแปลที่ <c>webhook.menu.*</c>)
/// จะแปลได้ก็ต่อเมื่อ rich menu ฝั่ง LINE มีชุดภาษาอังกฤษด้วย แล้วต้องรับทั้งสองคำพร้อมกัน
/// </para>
/// </summary>
public static class WebhookKeywords
{
    public const string Attendance = "ลงเวลา";
    public const string CheckQuota = "ตรวจสอบสิทธิ์";

    /// <summary>คำที่เปิดเมนูหลัก — มีหลายคำเพราะปุ่มแต่ละรุ่นของ rich menu ส่งคำต่างกัน</summary>
    public static readonly string[] Menu =
    [
        "ระบบบริหารงานบุคคล",
        "ระบบ HR",
        "HRMS",
        "TBG Assistant",
        "เมนู",
        "เมนูหลัก",
        "สร้างบิล",
    ];
}
