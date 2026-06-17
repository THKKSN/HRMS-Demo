using Hrms.Application.Features.Auth.Dtos;
using MediatR;

namespace Hrms.Application.Features.Auth.RefreshToken;

public record RefreshTokenCommand(string RefreshToken, string? Ip, string? UserAgent)
    : IRequest<AuthResultDto>;
