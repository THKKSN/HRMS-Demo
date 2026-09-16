namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// 409 — ทำรายการไม่ได้เพราะสถานะปัจจุบันของข้อมูลขัดกัน (ลาทับซ้อน, วันลาไม่พอ, เช็คอินซ้ำ ฯลฯ)
///
/// <para>เป็นชนิดที่ผู้ใช้เห็นบ่อยที่สุด — <c>Code</c> ทุกตัวควรมีคีย์คำแปลใน <c>packages/i18n/messages/*/errors.json</c></para>
/// </summary>
public class ConflictException(string code, string message) : AppException(409, code, message);
