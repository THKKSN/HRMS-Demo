using FluentValidation;
using MediatR;

namespace Hrms.Application.Features.Auth.PreviewEmployeeLink;

/// <summary>ขั้นแรกของการผูกบัญชี: ขอดูชื่อพนักงานจากรหัสพนักงาน ยังไม่ส่ง OTP</summary>
public sealed record PreviewEmployeeLinkCommand(string AccessToken, string EmployeeCode)
    : IRequest<PreviewEmployeeLinkResult>;

/// <summary>
/// คืนเฉพาะชื่อ-นามสกุลกับ preview token — ห้ามเพิ่ม employeeId, nationalId,
/// เบอร์โทร, อีเมล, แผนก, บริษัท หรือ lineUserId เข้ามาใน record นี้
/// </summary>
public sealed record PreviewEmployeeLinkResult(
    string FullName,
    string PreviewToken,
    int ExpiresIn);

public sealed class PreviewEmployeeLinkCommandValidator
    : AbstractValidator<PreviewEmployeeLinkCommand>
{
    public PreviewEmployeeLinkCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.EmployeeCode)
            .Cascade(CascadeMode.Stop)
            .Must(value => !string.IsNullOrWhiteSpace(value))
            .WithMessage("EmployeeCode is required.")
            .Must(value => value.Trim().Length <= 50)
            .WithMessage("EmployeeCode must be at most 50 characters.");
    }
}
