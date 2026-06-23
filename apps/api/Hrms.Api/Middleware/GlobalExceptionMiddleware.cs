using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Middleware;

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
                "ข้อมูลไม่ถูกต้อง",
                (object?)ve.Errors.Select(e => new { field = e.PropertyName, error = e.ErrorMessage })),

            AppUnauthorizedException ue => (
                StatusCodes.Status401Unauthorized,
                ue.Message,
                ue.Message,
                (object?)null),

            AppForbiddenException fe => (
                StatusCodes.Status403Forbidden,
                "FORBIDDEN",
                fe.Message,
                (object?)null),

            NotFoundException nfe => (
                StatusCodes.Status404NotFound,
                "NOT_FOUND",
                nfe.Message,
                (object?)null),

            KeyNotFoundException knfe => (
                StatusCodes.Status404NotFound,
                "NOT_FOUND",
                knfe.Message,
                (object?)null),

            ConflictException ce => (
                StatusCodes.Status409Conflict,
                ce.Code,
                ce.Message,
                (object?)null),

            _ => (
                StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR",
                "เกิดข้อผิดพลาดภายในระบบ",
                (object?)(env.IsDevelopment() ? ex.ToString() : null))
        };

        if (status >= 500)
            logger.LogError(ex, "Unhandled exception [{TraceId}]", traceId);

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        var body = new { traceId, error = code, message, details };
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, _json));
    }
}
