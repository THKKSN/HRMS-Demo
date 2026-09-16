using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Common;
using Hrms.Application.Features.Auth.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

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

        return await employee.BindLineAndIssueSessionAsync(
            db, jwt, profile.UserId, profile.PictureUrl, request.Ip, request.UserAgent, ct);
    }
}
