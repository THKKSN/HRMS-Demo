namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// 400 — คำขอไม่ถูกต้องในเชิงกติกาธุรกิจ (เลือกหมวดที่ปิดใช้งาน, แนบไฟล์เกินโควตา, ขาดข้อมูลที่จำเป็น ฯลฯ)
///
/// <para>
/// ใช้แทน <c>FluentValidation.ValidationException</c> ที่ throw จาก <b>ใน handler</b> — ตัวนั้นไม่มีที่ให้ใส่ code
/// จึงตกเป็น <c>VALIDATION_ERROR</c> ก้อนกลางทุกครั้ง ผู้ใช้เลยได้ข้อความกว้างกว่าที่ควรเป็น
/// </para>
/// <para>
/// <b>ไม่ใช้แทน</b> validator ของ FluentValidation ที่ผูกกับฟิลด์ (<c>RuleFor</c>) — ตรงนั้นยังต้องการ
/// <c>details[].field</c> เพื่อชี้ช่องกรอกที่ผิด และเป็นงานของ 3.10
/// </para>
/// </summary>
public class BadRequestException(string code, string message) : AppException(400, code, message);
