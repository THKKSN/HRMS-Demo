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
