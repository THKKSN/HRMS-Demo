using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeRoleDto(
    Guid Id,
    Guid RoleId,
    RoleType Role,
    Guid CompanyId,
    Guid? DepartmentId,
    bool IsActive);
