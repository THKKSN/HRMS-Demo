namespace Hrms.Application.Common.Interfaces;

/// <summary>
/// ตัวตนพนักงานที่ผ่านการยืนยันแล้ว ซึ่งถูกผูกไว้ใน preview token
/// ใช้ส่งต่อระหว่างขั้น preview (แสดงชื่อ) และขั้นขอ OTP เท่านั้น
/// </summary>
public sealed record LinkPreviewIdentity(Guid EmployeeId, string LineUserId);

/// <summary>
/// ออกและตรวจ token อายุสั้นสำหรับยืนยันตัวตนพนักงานก่อนส่ง OTP ผูกบัญชี LINE
/// token ถูกเข้ารหัสด้วย ASP.NET Core Data Protection จึงอ่านค่าข้างในจากฝั่ง client ไม่ได้
/// </summary>
public interface ILinkPreviewTokenService
{
    /// <summary>สร้าง token ที่ผูก employeeId กับ lineUserId ที่ verify แล้ว</summary>
    string Create(Guid employeeId, string lineUserId);

    /// <summary>ตรวจ token — คืน null ถ้าหมดอายุ ถูกแก้ไข หรือมาจาก purpose อื่น</summary>
    LinkPreviewIdentity? Validate(string token);
}
