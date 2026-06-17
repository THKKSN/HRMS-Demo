using FluentValidation;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;

namespace Hrms.Application.Features.Auth.LinkAccount;

public record LinkAccountCommand(string AccessToken, string Otp, string? Ip, string? UserAgent)
    : IRequest<AuthResultDto>;

public class LinkAccountCommandValidator : AbstractValidator<LinkAccountCommand>
{
    public LinkAccountCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.Otp)
            .NotEmpty()
            .Length(6)
            .Matches(@"^\d{6}$").WithMessage("OTP must be 6 digits.");
    }
}
