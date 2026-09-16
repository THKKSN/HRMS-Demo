using FluentValidation;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;

namespace Hrms.Application.Features.Auth.RequestOtp;

/// <summary>
/// ขั้นที่สองของการผูกบัญชี: ยืนยันว่าเป็นตัวเองแล้ว จึงขอ OTP
/// รับ preview token จาก /auth/link/preview ไม่รับรหัสพนักงานหรือเลขบัตรประชาชน
/// Ip/UserAgent ใช้เฉพาะตอน fallback (push เต็ม) ที่ต้องออก refresh token ให้เลย
/// </summary>
public record RequestOtpCommand(
    string AccessToken,
    string PreviewToken,
    string? Ip = null,
    string? UserAgent = null)
    : IRequest<RequestOtpResult>;

/// <summary>
/// ปกติคืนแค่ Hint ("OTP ส่งแล้ว") ให้ client ไปหน้ากรอก OTP
/// แต่ถ้า LINE push เต็ม (quota) ระบบจะผูกบัญชีให้เลยแล้วแนบ Session มาด้วย
/// client ที่เห็น Session ให้ล็อกอินตรง ข้ามหน้า OTP
/// </summary>
public record RequestOtpResult(string Hint, AuthResultDto? Session = null);

public class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.PreviewToken).NotEmpty();
    }
}
