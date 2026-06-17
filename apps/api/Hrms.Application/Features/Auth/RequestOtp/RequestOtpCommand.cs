using FluentValidation;
using MediatR;

namespace Hrms.Application.Features.Auth.RequestOtp;

public record RequestOtpCommand(string AccessToken, string EmployeeCode, string NationalId)
    : IRequest<RequestOtpResult>;

public record RequestOtpResult(string Hint);

public class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.EmployeeCode).NotEmpty();
        RuleFor(x => x.NationalId)
            .NotEmpty()
            .Length(13)
            .Matches(@"^\d{13}$").WithMessage("NationalId must be 13 digits.");
    }
}
