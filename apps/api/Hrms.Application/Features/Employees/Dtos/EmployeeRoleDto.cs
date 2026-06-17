using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeRoleDto(
    Guid Id,
    RoleType Role,
    Guid CompanyId,
    Guid? DepartmentId,
    bool IsActive);
