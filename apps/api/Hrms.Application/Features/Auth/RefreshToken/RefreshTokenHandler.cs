using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;
using DomainRefreshToken = Hrms.Domain.Entities.RefreshToken;

namespace Hrms.Application.Features.Auth.RefreshToken;

public class RefreshTokenHandler(
    IApplicationDbContext db,
    IJwtService jwt) : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var hash = jwt.HashToken(request.RefreshToken);

        var stored = await db.RefreshTokens
            .Include(t => t.Employee).ThenInclude(e => e.Roles.Where(r => r.IsActive))
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow)
            throw new AppUnauthorizedException("Invalid or expired refresh token.");

        var employee = stored.Employee;
        if (!employee.IsActive)
            throw new AppUnauthorizedException("Employee is inactive.");

        var (accessToken, accessExpires) = jwt.GenerateAccessToken(employee, employee.Roles);
        var (newRefreshToken, newHash, refreshExpires) = jwt.GenerateRefreshToken();

        // rotate: revoke old, issue new
        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByTokenHash = newHash;

        db.RefreshTokens.Add(new DomainRefreshToken
        {
            EmployeeId = employee.Id,
            TokenHash = newHash,
            ExpiresAt = refreshExpires,
            CreatedByIp = request.Ip,
            UserAgent = request.UserAgent
        });

        await db.SaveChangesAsync(ct);

        var expiresIn = (int)(accessExpires - DateTime.UtcNow).TotalSeconds;
        return new AuthResultDto(accessToken, newRefreshToken, expiresIn, employee.ToAuthDto());
    }
}
