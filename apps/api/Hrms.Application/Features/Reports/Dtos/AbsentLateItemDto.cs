namespace Hrms.Application.Features.Reports.Dtos;

public record AbsentLateItemDto(
    Guid EmployeeId,
    string EmployeeFullName,
    string? DepartmentName,
    int? LateMinutes);
