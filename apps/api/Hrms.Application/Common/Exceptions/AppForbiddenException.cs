namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// 403 — ยืนยันตัวตนแล้วแต่ไม่มีสิทธิ์ทำสิ่งนี้
///
/// <para>
/// <b>arg เดียว = message</b> (code ตกเป็น <c>FORBIDDEN</c> ก้อนกลาง) — รูปแบบเดิมที่จุดเรียกส่วนใหญ่ใช้อยู่
/// </para>
/// <para>
/// <b>สองตัว = (code, message)</b> ลำดับเดียวกับ <see cref="ConflictException"/> — ใช้เมื่ออยากให้หน้าจอ
/// แยกแยะเหตุผลได้ เช่น <c>new AppForbiddenException("TICKET_NOT_IN_SCOPE", "Ticket belongs to another company.")</c>
/// </para>
/// </summary>
public class AppForbiddenException : AppException
{
    public AppForbiddenException(string message) : base(403, "FORBIDDEN", message) { }

    public AppForbiddenException(string code, string message) : base(403, code, message) { }
}
