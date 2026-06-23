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
    string? CompanyName,
    Guid? DepartmentId,
    string? DepartmentName,
    string? RoleLabelName,
    DateOnly? HireDate,
    IReadOnlyList<RoleClaim> Roles);
