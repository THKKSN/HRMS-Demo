namespace Hrms.Application.Features.LeaveBalances.Dtos;

public record LeaveBalanceAdminDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    Guid LeaveTypeId,
    string LeaveTypeName,
    int Year,
    decimal TotalDays,
    decimal UsedDays,
    decimal PendingDays,
    decimal RemainingDays);
