using Hrms.Application.Features.Auth.Dtos;
using MediatR;

namespace Hrms.Application.Features.Auth.LoginWithLine;

public record LoginWithLineCommand(string AccessToken, string? Ip, string? UserAgent)
    : IRequest<AuthResultDto>;
