namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// 401 — ยังไม่ผ่านการยืนยันตัวตน หรือ token ใช้ไม่ได้
///
/// <para>
/// <b>arg เดียว = code</b> (ไม่ใช่ข้อความ) ตามที่จุดเรียกส่วนใหญ่ใช้อยู่แล้ว เช่น <c>UNAUTHENTICATED</c>, <c>EMPLOYEE_NOT_FOUND</c>
/// — เดิมคลาสนี้ไม่มี <c>Code</c> แยก middleware จึงเอา message ไปใช้เป็น code ตรง ๆ การรับ code เป็น arg แรก
/// จึงเป็นการทำให้พฤติกรรมที่ใช้กันอยู่แล้วชัดเจนขึ้น ไม่ได้เปลี่ยนความหมายของจุดเรียกเดิม
/// </para>
/// <para>อยากใส่รายละเอียดให้ log ด้วยก็ส่งสองตัว: <c>new AppUnauthorizedException("LINE_TOKEN_EXPIRED", "LINE access token expired.")</c></para>
/// </summary>
public class AppUnauthorizedException : AppException
{
    public AppUnauthorizedException(string code) : base(401, code, code) { }

    public AppUnauthorizedException(string code, string message) : base(401, code, message) { }
}
