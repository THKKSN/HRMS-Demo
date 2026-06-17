namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeListItemDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    Guid CompanyId,
    Guid? DepartmentId,
    string? DepartmentName,
    IReadOnlyList<string> Roles,
    bool IsActive);
