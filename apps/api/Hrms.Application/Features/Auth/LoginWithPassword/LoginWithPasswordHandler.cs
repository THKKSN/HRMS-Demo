using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;
using DomainRefreshToken = Hrms.Domain.Entities.RefreshToken;

namespace Hrms.Application.Features.Auth.LoginWithPassword;

public class LoginWithPasswordHandler(
    IApplicationDbContext db,
    IPasswordService passwordService,
    IJwtService jwt) : IRequestHandler<LoginWithPasswordCommand, AuthResultDto>
{
    private const string InvalidCredentials = "INVALID_CREDENTIALS";

    public async Task<AuthResultDto> Handle(LoginWithPasswordCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Roles.Where(r => r.IsActive))
            .FirstOrDefaultAsync(e => e.Email == request.Email && e.IsActive, ct);

        // ไม่แยก "not found" vs "wrong password" — กัน username enumeration
        if (employee is null || employee.PasswordHash is null)
            throw new AppUnauthorizedException(InvalidCredentials);

        if (!passwordService.Verify(request.Password, employee.PasswordHash))
            throw new AppUnauthorizedException(InvalidCredentials);

        var (accessToken, accessExpires) = jwt.GenerateAccessToken(employee, employee.Roles);
        var (refreshToken, refreshHash, refreshExpires) = jwt.GenerateRefreshToken();

        db.RefreshTokens.Add(new DomainRefreshToken
        {
            EmployeeId  = employee.Id,
            TokenHash   = refreshHash,
            ExpiresAt   = refreshExpires,
            CreatedByIp = request.Ip,
            UserAgent   = request.UserAgent
        });

        db.LoginHistories.Add(new Domain.Entities.LoginHistory
        {
            EmployeeId  = employee.Id,
            LoginMethod = "Password",
            IpAddress   = request.Ip,
            UserAgent   = request.UserAgent
        });

        await db.SaveChangesAsync(ct);

        var expiresIn = (int)(accessExpires - DateTime.UtcNow).TotalSeconds;
        return new AuthResultDto(accessToken, refreshToken, expiresIn, employee.ToAuthDto());
    }
}
