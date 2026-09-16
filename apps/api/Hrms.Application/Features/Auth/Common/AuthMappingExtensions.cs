using Hrms.Application.Common.Models;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Auth.Common;

public static class AuthMappingExtensions
{
    public static AuthEmployeeDto ToAuthDto(
        this Employee employee,
        IReadOnlyList<string>? permissionCodes = null)
    {
        var roles = employee.Roles
            .Where(r => r.IsActive)
            .Select(r => new RoleClaim(
                r.RoleId,
                SystemRoleIds.ToCode(r.RoleId).ToString(),
                r.CompanyId,
                r.DepartmentId))
            .ToList();

        return new AuthEmployeeDto(
            employee.Id,
            employee.EmployeeCode,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.AvatarUrl,
            employee.CompanyId,
            roles,
            permissionCodes ?? []);
    }

    /// <summary>
    /// ผูก LINE user เข้ากับพนักงาน แล้วออก access/refresh token — จุดจบร่วมของทั้ง
    /// การยืนยัน OTP และการ fallback ตอน push เต็ม เรียกหลังตรวจสิทธิ์ครบแล้วเท่านั้น
    /// </summary>
    public static async Task<AuthResultDto> BindLineAndIssueSessionAsync(
        this Employee employee,
        IApplicationDbContext db,
        IJwtService jwt,
        string lineUserId,
        string? pictureUrl,
        string? ip,
        string? userAgent,
        CancellationToken ct = default)
    {
        employee.LineUserId = lineUserId;
        if (pictureUrl is not null)
            employee.AvatarUrl = pictureUrl;

        var (accessToken, accessExpires) = jwt.GenerateAccessToken(employee, employee.Roles);
        var (refreshToken, refreshHash, refreshExpires) = jwt.GenerateRefreshToken();

        db.RefreshTokens.Add(new Hrms.Domain.Entities.RefreshToken
        {
            EmployeeId = employee.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpires,
            CreatedByIp = ip,
            UserAgent = userAgent
        });

        await db.SaveChangesAsync(ct);

        var expiresIn = (int)(accessExpires - DateTime.UtcNow).TotalSeconds;
        var permissionCodes = await employee.GetPermissionCodesAsync(db, ct);
        return new AuthResultDto(accessToken, refreshToken, expiresIn, employee.ToAuthDto(permissionCodes));
    }

    public static async Task<IReadOnlyList<string>> GetPermissionCodesAsync(
        this Employee employee,
        IApplicationDbContext db,
        CancellationToken ct = default)
    {
        var roleIds = employee.Roles
            .Where(r => r.IsActive)
            .Select(r => r.RoleId)
            .Distinct()
            .ToList();

        if (roleIds.Count == 0)
            return [];

        return await db.RolePermissions
            .AsNoTracking()
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .OrderBy(code => code)
            .ToListAsync(ct);
    }
}
