using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.Middleware;

/// <summary>
/// แปลง exception เป็น response รูปแบบเดียวกันทั้งระบบ: <c>{ traceId, error, message, details }</c>
///
/// <para>
/// <b>กติกา D7 (แผน i18n ข้อ 3):</b> <c>error</c> คือ code ที่ frontend ใช้เลือกคำแปล ส่วน <c>message</c>
/// เป็น <b>ภาษาอังกฤษสำหรับ developer เท่านั้น</b> — ห้ามใส่ข้อความไทยที่นี่หรือที่จุด throw
/// ถ้าผู้ใช้เห็น <c>message</c> บนหน้าจอแปลว่า code นั้นยังไม่มีคีย์ใน <c>packages/i18n/messages/*/errors.json</c>
/// </para>
/// <para>
/// exception ที่สืบทอด <see cref="AppException"/> พก status/code มาเองแล้ว จึงไม่ต้องเพิ่มเคสที่นี่เวลาสร้างชนิดใหม่
/// เคสที่เหลือข้างล่างคือ exception จาก BCL/library ที่แก้ที่ต้นทางไม่ได้
/// </para>
/// </summary>
public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var traceId = context.TraceIdentifier;

        var (status, code, message, details) = ex switch
        {
            ValidationException ve => (
                StatusCodes.Status400BadRequest,
                "VALIDATION_ERROR",
                "One or more fields are invalid.",
                ValidationDetails(ve)),

            // 502 ต้องแยกออกมาเพราะแนบรายละเอียดจากระบบต้นทางเฉพาะตอน Development
            ExternalServiceUnavailableException esu => (
                esu.StatusCode,
                esu.Code,
                esu.Message,
                ExternalServiceDetails(esu)),

            // ทุกชนิดที่สืบทอด AppException พก status + code มาเอง
            AppException ae => (
                ae.StatusCode,
                ae.Code,
                ae.Message,
                (object?)null),

            // BCL: หลาย flow ยังใช้ตัวนี้แทน NotFoundException — แยกเคสไม่ได้ ได้ code ก้อนกลางเหมือนกันหมด
            KeyNotFoundException knfe => (
                StatusCodes.Status404NotFound,
                "NOT_FOUND",
                knfe.Message,
                (object?)null),

            DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "TICKET_CONCURRENCY_CONFLICT",
                "This record was changed by someone else. Reload and try again.",
                (object?)null),

            _ => (
                StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR",
                "An unexpected error occurred.",
                (object?)(env.IsDevelopment() ? ex.ToString() : null))
        };

        if (status >= 500)
            logger.LogError(ex, "Unhandled exception [{TraceId}]", traceId);

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        var body = new { traceId, error = code, message, details };
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, _json));
    }

    /// <summary>
    /// รายละเอียดราย field ของ FluentValidation — <c>{ field, code, message }</c> (แผน i18n งาน 3.10)
    ///
    /// <para>
    /// <c>field</c> เป็น camelCase ให้ตรงกับชื่อช่องในฟอร์มฝั่งหน้าจอ · <c>code</c> คือตัวที่ใช้หาคำแปล
    /// · <c>message</c> เป็นภาษาอังกฤษสำหรับ developer เหมือนทุกที่ตามกติกา D7
    /// </para>
    /// </summary>
    private static object ValidationDetails(ValidationException exception)
    {
        var errors = exception.Errors
            .Select(error => new
            {
                field = CamelCaseField(error.PropertyName),
                code = ValidationCode(error.ErrorCode),
                message = error.ErrorMessage
            })
            .ToArray();
        return errors.Length > 0
            ? errors
            : [new { field = string.Empty, code = "VALIDATION_ERROR", message = exception.Message }];
    }

    /// <summary>
    /// รหัสของ validator ที่ FluentValidation ตั้งให้เอง → code กลางของเรา
    /// (rule ที่ตั้ง <c>.WithErrorCode("SCREAMING_SNAKE")</c> เองจะผ่านออกไปตรง ๆ)
    ///
    /// <para>ผลคือ rule ที่ยังไม่ได้ตั้ง code เองก็ยังได้คำแปล ไม่ตกไปเป็นข้อความอังกฤษ default ของ library</para>
    /// </summary>
    private static string ValidationCode(string? errorCode) => errorCode switch
    {
        null or "" => "VALIDATION_ERROR",
        "NotEmptyValidator" or "NotNullValidator" => "VALIDATION_REQUIRED",
        "EmptyValidator" or "NullValidator" => "VALIDATION_MUST_BE_EMPTY",
        "MaximumLengthValidator" or "LengthValidator" or "ExactLengthValidator" => "VALIDATION_TOO_LONG",
        "MinimumLengthValidator" => "VALIDATION_TOO_SHORT",
        "EmailValidator" => "VALIDATION_EMAIL_INVALID",
        "RegularExpressionValidator" => "VALIDATION_FORMAT_INVALID",
        "GreaterThanValidator" or "GreaterThanOrEqualValidator" or "LessThanValidator"
            or "LessThanOrEqualValidator" or "InclusiveBetweenValidator" or "ExclusiveBetweenValidator"
            or "ScalePrecisionValidator" => "VALIDATION_OUT_OF_RANGE",
        "EqualValidator" or "NotEqualValidator" or "EnumValidator"
            or "PredicateValidator" or "AsyncPredicateValidator" => "VALIDATION_VALUE_INVALID",
        _ => errorCode
    };

    /// <summary>`EmployeeIds` → `employeeIds`, `Items[0].Amount` → `items[0].amount` ให้ตรงชื่อช่องในฟอร์ม</summary>
    private static string CamelCaseField(string propertyName)
    {
        if (string.IsNullOrEmpty(propertyName)) return propertyName;
        var segments = propertyName.Split('.');
        for (var i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];
            if (segment.Length > 0 && char.IsUpper(segment[0]))
                segments[i] = char.ToLowerInvariant(segment[0]) + segment[1..];
        }
        return string.Join('.', segments);
    }

    private object? ExternalServiceDetails(ExternalServiceUnavailableException exception)
    {
        if (!env.IsDevelopment() || (exception.UpstreamStatusCode is null && exception.ResponseBodySnippet is null))
            return null;

        return new
        {
            upstreamStatusCode = exception.UpstreamStatusCode,
            upstreamBody = exception.ResponseBodySnippet
        };
    }
}
