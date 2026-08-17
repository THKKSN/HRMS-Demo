using FluentValidation;
using Hrms.Application.Common.Validation;
using MediatR;

namespace Hrms.Application.Features.Auth.RequestOtp;

public record RequestOtpCommand(string AccessToken, string NationalId)
    : IRequest<RequestOtpResult>;

public record RequestOtpResult(string Hint);

public class RequestOtpCommandValidator : AbstractValidator<RequestOtpCommand>
{
    public RequestOtpCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.NationalId)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(ThaiNationalId.IsValid)
            .WithMessage("NationalId must be a valid Thai national ID.");
    }
}
