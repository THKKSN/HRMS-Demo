using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;

namespace Hrms.Api.Middleware;

/// <summary>
/// จำภาษาล่าสุดของผู้ใช้จาก header <c>X-Locale</c> ที่ frontend ทั้งสองแอปแนบมาทุก request
/// (แพตเทิร์นเดียวกับ <c>X-Client-App</c>)
///
/// <para>
/// ทำไมต้องจำลง DB: job ที่ส่ง notification ทำงาน<b>นอก request</b> — ไม่มี cookie ไม่มี LIFF context
/// ให้อ่าน "ภาษาตอนนั้น" ได้เอง และผู้รับก็คนละคนกับผู้กระทำ จะยืมภาษาของคนที่กดปุ่มมาใช้ก็ไม่ได้
/// ดู docs/notification-i18n-plan.md ข้อ D9
/// </para>
/// <para>
/// ต้องวางไว้<b>หลัง</b> <c>UseAuthorization()</c> เพราะ endpoint ของผู้แจ้งภายนอกใช้ authentication
/// scheme แยก — <c>context.User</c> จะมี claim ของกลุ่มนั้นก็ต่อเมื่อ authorization middleware
/// ตรวจ policy เสร็จแล้วเท่านั้น
/// </para>
/// </summary>
public sealed class PreferredLanguageMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Locale";

    public async Task InvokeAsync(HttpContext context, IPreferredLanguageStore store)
    {
        await RememberAsync(context, store);
        await next(context);
    }

    private static async Task RememberAsync(HttpContext context, IPreferredLanguageStore store)
    {
        if (context.User.Identity?.IsAuthenticated != true) return;

        // ไม่มี header = ยังไม่รู้ภาษา (เช่น LIFF ที่ยังไม่ผ่านหน้าเลือกภาษา) — อย่าเขียนทับของเดิม
        var locale = AppLocale.Normalize(context.Request.Headers[HeaderName].ToString());
        if (locale is null) return;

        if (string.Equals(context.User.FindFirstValue("actor_type"), "external", StringComparison.Ordinal))
        {
            if (Guid.TryParse(context.User.FindFirstValue("external_reporter_id"), out var reporterId))
                await store.RememberExternalReporterAsync(reporterId, locale, context.RequestAborted);
            return;
        }

        if (Guid.TryParse(context.User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var employeeId))
            await store.RememberEmployeeAsync(employeeId, locale, context.RequestAborted);
    }
}
