namespace Hrms.Application.Features.Departments.Dtos;

public record DepartmentDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    string? ManagerName,
    bool IsActive);

public record DepartmentListItemDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    string? ManagerName,
    int EmployeeCount,
    bool IsActive);
