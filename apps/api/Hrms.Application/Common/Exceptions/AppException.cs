namespace Hrms.Application.Common.Exceptions;

/// <summary>
/// ฐานของ exception ที่ตั้งใจให้กลายเป็น HTTP error response
///
/// <para>
/// <b>กติกา D7 (แผน i18n ข้อ 3):</b> API ส่ง <c>code</c> + <c>message</c> <b>ภาษาอังกฤษเท่านั้น</b>
/// </para>
/// <list type="bullet">
/// <item><see cref="Code"/> — ตัวที่ frontend ใช้เลือกคำแปล (<c>errors.&lt;CODE&gt;</c>) ต้องเป็น SCREAMING_SNAKE ที่เสถียร ห้ามเปลี่ยนพร่ำเพรื่อเพราะผูกกับคีย์คำแปล</item>
/// <item><see cref="Exception.Message"/> — ข้อความ <b>สำหรับ developer</b> (log / traceId / debug) ผู้ใช้ไม่ควรเห็น
/// ถ้าผู้ใช้เห็นข้อความนี้บนหน้าจอแปลว่าเส้นทางนั้นยังไม่มีคีย์คำแปล = bug ที่ต้องเติมใน <c>errors.json</c></item>
/// </list>
/// <para>
/// <see cref="StatusCode"/> ติดมากับ exception เพื่อให้ <c>GlobalExceptionMiddleware</c> ไม่ต้อง match ทีละชนิด
/// — exception ใหม่ที่สืบทอดคลาสนี้จะได้ response ที่ถูกต้องทันทีโดยไม่ต้องแก้ middleware
/// </para>
/// </summary>
public abstract class AppException(int statusCode, string code, string message, Exception? innerException = null)
    : Exception(message, innerException)
{
    /// <summary>HTTP status ที่จะตอบกลับ</summary>
    public int StatusCode { get; } = statusCode;

    /// <summary>error code ที่ frontend ใช้หาคำแปล — ส่งออกไปเป็นฟิลด์ <c>error</c> ใน response body</summary>
    public string Code { get; } = code;
}
