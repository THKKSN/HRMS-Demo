using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Auth.PreviewEmployeeLink;

public sealed class PreviewEmployeeLinkHandler(
    IApplicationDbContext db,
    ILineAuthService line,
    ILinkPreviewTokenService previewTokens)
    : IRequestHandler<PreviewEmployeeLinkCommand, PreviewEmployeeLinkResult>
{
    /// <summary>อายุ preview token (วินาที) — ตรงกับ TTL ที่ลงทะเบียนไว้ใน DI</summary>
    private const int PreviewLifetimeSeconds = 300;

    public async Task<PreviewEmployeeLinkResult> Handle(
        PreviewEmployeeLinkCommand request,
        CancellationToken ct)
    {
        // ต้อง verify LINE ก่อนแตะตาราง employees เสมอ ไม่ให้ใช้ endpoint นี้
        // เดารหัสพนักงานโดยไม่มี access token ที่ใช้ได้จริง
        var profile = await line.VerifyAccessTokenAsync(request.AccessToken, ct);

        var employeeCode = EmployeeCodeNormalizer.Normalize(request.EmployeeCode);
        if (employeeCode.Length == 0)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var matches = await db.Employees
            .Where(employee => employee.EmployeeCode == employeeCode && employee.IsActive)
            .Take(2)
            .ToListAsync(ct);

        // ไม่พบ / inactive / เจอมากกว่า 1 คน ใช้ error เดียวกันหมด ไม่บอกว่าต่างกันอย่างไร
        if (matches.Count != 1)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var employee = matches[0];

        if (employee.LineUserId is not null)
            throw new ConflictException(
                "ALREADY_LINKED",
                "This employee is already linked to a LINE account.");

        var fullName = $"{employee.FirstName} {employee.LastName}".Trim();

        return new PreviewEmployeeLinkResult(
            fullName,
            previewTokens.Create(employee.Id, profile.UserId),
            PreviewLifetimeSeconds);
    }
}
