namespace Hrms.Application.Common.Exceptions;

/// <summary>404 — ระบบต้นทาง (HR ภายนอก) ไม่มีพนักงานคนนี้</summary>
public sealed class ExternalEmployeeNotFoundException()
    : AppException(404, "EXTERNAL_EMPLOYEE_NOT_FOUND", "Employee not found in the upstream system.");

/// <summary>422 — ระบบต้นทางตอบกลับมาแต่ข้อมูลไม่ครบ/ผิดรูปจนใช้ต่อไม่ได้</summary>
public sealed class ExternalEmployeeDataException(string message)
    : AppException(422, "EXTERNAL_DATA_INVALID", message);

/// <summary>502 — เรียกระบบต้นทางไม่สำเร็จ (ต่อไม่ติด หรือตอบ status ที่ใช้ไม่ได้)</summary>
public sealed class ExternalServiceUnavailableException(
    int? statusCode = null,
    string? responseBodySnippet = null,
    Exception? innerException = null)
    : AppException(502, "EXTERNAL_SERVICE_UNAVAILABLE", "External service is unavailable.", innerException)
{
    /// <summary>status ที่ระบบต้นทางตอบมา — โผล่ใน response เฉพาะตอน Development</summary>
    public int? UpstreamStatusCode { get; } = statusCode;

    /// <summary>ท่อนแรกของ body ที่ระบบต้นทางตอบมา — โผล่ใน response เฉพาะตอน Development</summary>
    public string? ResponseBodySnippet { get; } = responseBodySnippet;
}

/// <summary>504 — ระบบต้นทางตอบช้าเกิน timeout ที่ตั้งไว้</summary>
public sealed class ExternalServiceTimeoutException()
    : AppException(504, "EXTERNAL_SERVICE_TIMEOUT", "External service timed out.");
