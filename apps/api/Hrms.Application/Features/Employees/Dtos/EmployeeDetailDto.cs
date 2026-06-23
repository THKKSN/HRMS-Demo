namespace Hrms.Application.Features.Employees.Dtos;

public record EmployeeDetailDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    string? Email,
    string? Phone,
    string? NationalIdMasked,
    string? NationalId,
    Guid CompanyId,
    Guid? DepartmentId,
    string? DepartmentName,
    DateOnly? HireDate,
    bool IsActive,
    IReadOnlyList<EmployeeRoleDto> Roles,
    Guid? RoleLabelId,
    string? RoleLabelName);
