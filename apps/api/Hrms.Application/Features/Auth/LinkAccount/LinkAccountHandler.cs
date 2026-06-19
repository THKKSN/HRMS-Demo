using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;
using DomainRefreshToken = Hrms.Domain.Entities.RefreshToken;

namespace Hrms.Application.Features.Auth.LinkAccount;

public class LinkAccountHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    IOtpService otp,
    IJwtService jwt) : IRequestHandler<LinkAccountCommand, AuthResultDto>
{
    public async Task<AuthResultDto> Handle(LinkAccountCommand request, CancellationToken ct)
    {
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        var employeeId = await otp.ValidateAndConsumeAsync(profile.UserId, request.Otp, ct);
        if (employeeId is null)
            throw new AppUnauthorizedException("INVALID_OR_EXPIRED_OTP");

        var employee = await db.Employees
            .Include(e => e.Roles.Where(r => r.IsActive))
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        employee.LineUserId = profile.UserId;
        if (profile.PictureUrl is not null)
            employee.AvatarUrl = profile.PictureUrl;

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

        await db.SaveChangesAsync(ct);

        var expiresIn = (int)(accessExpires - DateTime.UtcNow).TotalSeconds;
        return new AuthResultDto(accessToken, refreshToken, expiresIn, employee.ToAuthDto());
    }
}
