namespace Hrms.Application.Features.LeaveBalances.Dtos;

public record LeaveBalanceAdminDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string? DepartmentName,
    Guid LeaveTypeId,
    string LeaveTypeName,
    int Year,
    decimal TotalDays,
    decimal UsedDays,
    decimal PendingDays,
    decimal RemainingDays);
