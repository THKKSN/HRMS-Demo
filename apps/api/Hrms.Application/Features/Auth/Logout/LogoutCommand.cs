using MediatR;

namespace Hrms.Application.Features.Auth.Logout;

public record LogoutCommand(string RefreshToken) : IRequest;
