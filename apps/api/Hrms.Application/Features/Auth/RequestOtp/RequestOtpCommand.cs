using FluentValidation;
using MediatR;

namespace Hrms.Application.Features.Auth.RequestOtp;

/// <summary>
/// ขั้นที่สองของการผูกบัญชี: ยืนยันว่าเป็นตัวเองแล้ว จึงขอ OTP
/// รับ preview token จาก /auth/link/preview ไม่รับรหัสพนักงานหรือเลขบัตรประชาชน
/// </summary>
public record RequestOtpCommand(string AccessToken, string PreviewToken)
    : IRequest<RequestOtpResult>;

public record RequestOtpResult(string Hint);

public class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.PreviewToken).NotEmpty();
    }
}
