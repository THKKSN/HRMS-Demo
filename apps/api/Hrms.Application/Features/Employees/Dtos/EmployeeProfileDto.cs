using Hrms.Application.Common.Models;

namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeProfileDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    string? Email,
    string? Phone,
    string? AvatarUrl,
    Guid CompanyId,
    Guid? DepartmentId,
    DateOnly? HireDate,
    IReadOnlyList<RoleClaim> Roles);
