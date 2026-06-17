using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;
using DomainRefreshToken = Hrms.Domain.Entities.RefreshToken;

namespace Hrms.Application.Features.Auth.LoginWithLine;

public class LoginWithLineHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    IJwtService jwt) : IRequestHandler<LoginWithLineCommand, AuthResultDto>
{
    public async Task<AuthResultDto> Handle(LoginWithLineCommand request, CancellationToken ct)
    {
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        var employee = await db.Employees
            .Include(e => e.Roles.Where(r => r.IsActive))
            .FirstOrDefaultAsync(e => e.LineUserId == profile.UserId && e.IsActive, ct);

        if (employee is null)
            throw new AccountNotLinkedException(profile.UserId);

        var (accessToken, accessExpires) = jwt.GenerateAccessToken(employee, employee.Roles);
        var (refreshToken, refreshHash, refreshExpires) = jwt.GenerateRefreshToken();

        db.RefreshTokens.Add(new DomainRefreshToken
        {
            EmployeeId = employee.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpires,
            CreatedByIp = request.Ip,
            UserAgent = request.UserAgent
        });

        db.LoginHistories.Add(new Domain.Entities.LoginHistory
        {
            EmployeeId = employee.Id,
            LoginMethod = "Line",
            IpAddress = request.Ip,
            UserAgent = request.UserAgent
        });

        await db.SaveChangesAsync(ct);

        var expiresIn = (int)(accessExpires - DateTime.UtcNow).TotalSeconds;
        return new AuthResultDto(accessToken, refreshToken, expiresIn, employee.ToAuthDto());
    }
}
