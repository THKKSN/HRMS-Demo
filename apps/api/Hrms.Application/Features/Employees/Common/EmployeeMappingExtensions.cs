using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Entities;

namespace Hrms.Application.Features.Employees.Common;

public static class EmployeeMappingExtensions
{
    public static EmployeeDetailDto ToDetailDto(this Employee e, string? departmentName) =>
        new(
            e.Id,
            e.EmployeeCode,
            $"{e.FirstName} {e.LastName}".Trim(),
            e.Email,
            e.Phone,
            MaskNationalId(e.NationalId),
            e.CompanyId,
            e.DepartmentId,
            departmentName,
            e.HireDate,
            e.IsActive,
            e.Roles.Select(r => new EmployeeRoleDto(r.Id, r.Role, r.CompanyId ?? e.CompanyId, r.DepartmentId, r.IsActive)).ToList()
        );

    private static string? MaskNationalId(string? id)
    {
        if (string.IsNullOrEmpty(id) || id.Length < 5) return id;
        return id[0] + new string('*', id.Length - 5) + id[^4..];
    }
}
