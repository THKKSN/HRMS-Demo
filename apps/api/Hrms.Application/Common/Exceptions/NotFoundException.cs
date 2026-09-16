namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// 404 — ไม่พบข้อมูลที่อ้างถึง
///
/// <para>
/// <paramref name="entityName"/> เป็นชื่อ entity <b>ภาษาอังกฤษ</b> สำหรับ log เท่านั้น (เช่น <c>"Company"</c>)
/// ไม่ใช่ข้อความที่ผู้ใช้เห็น — หน้าจอแปลจาก <see cref="AppException.Code"/>
/// </para>
/// <para>
/// ส่ง <paramref name="code"/> เมื่ออยากให้หน้าจอบอกได้ว่าไม่พบ "อะไร" เช่น <c>LEAVE_TYPE_NOT_FOUND</c>
/// ไม่ส่งก็ตกเป็น <c>NOT_FOUND</c> ก้อนกลาง
/// </para>
/// </summary>
public class NotFoundException(string entityName, object id, string code = "NOT_FOUND")
    : AppException(404, code, $"{entityName} not found (id: {id})")
{
    public string EntityName { get; } = entityName;
    public object Id { get; } = id;
}
