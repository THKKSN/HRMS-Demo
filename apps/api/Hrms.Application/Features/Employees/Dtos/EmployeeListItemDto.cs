namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeListItemDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    Guid CompanyId,
    string CompanyName,
    Guid? DepartmentId,
    string? DepartmentName,
    IReadOnlyList<string> Roles,
    Guid? RoleLabelId,
    string? RoleLabelName,
    bool IsActive);
