using FluentValidation;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;

namespace Hrms.Application.Features.Auth.LoginWithPassword;

public record LoginWithPasswordCommand(
    string Email,
    string Password,
    string? Ip,
    string? UserAgent) : IRequest<AuthResultDto>;

public class LoginWithPasswordCommandValidator : AbstractValidator<LoginWithPasswordCommand>
{
    public LoginWithPasswordCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8);
    }
}
