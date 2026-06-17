using Hrms.Application.Common.Models;
using Hrms.Application.Features.Auth.Dtos;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Auth.Common;

public static class AuthMappingExtensions
{
    public static AuthEmployeeDto ToAuthDto(this Employee employee)
    {
        var roles = employee.Roles
            .Where(r => r.IsActive)
            .Select(r => new RoleClaim(r.Role.ToString(), r.CompanyId, r.DepartmentId))
            .ToList();

        return new AuthEmployeeDto(
            employee.Id,
            employee.EmployeeCode,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.AvatarUrl,
            employee.CompanyId,
            roles);
    }
}
