namespace Hrms.Application.Features.Departments.Dtos;

public record DepartmentDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    string? ManagerName,
    Guid? ShiftId,
    string? ShiftName,
    bool IsActive);

public record DepartmentListItemDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    string? ManagerName,
    Guid? ShiftId,
    string? ShiftName,
    int EmployeeCount,
    bool IsActive);
