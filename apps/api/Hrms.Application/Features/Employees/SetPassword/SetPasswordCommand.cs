using FluentValidation;
using MediatR;

namespace Hrms.Application.Features.Employees.SetPassword;

public record SetPasswordCommand(Guid EmployeeId, string NewPassword) : IRequest;

public class SetPasswordCommandValidator : AbstractValidator<SetPasswordCommand>
{
    // อย่างน้อย 8 ตัว, มีตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข, อักขระพิเศษ
    private const string ComplexityPattern = @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$";

    public SetPasswordCommandValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotEmpty();

        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .Matches(ComplexityPattern)
            .WithErrorCode("PASSWORD_COMPLEXITY").WithMessage("The password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit and a special character.");
    }
}
