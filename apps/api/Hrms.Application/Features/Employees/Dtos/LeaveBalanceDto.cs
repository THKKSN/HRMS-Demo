namespace Hrms.Application.Features.Employees.Dtos;

public record LeaveBalanceDto(
    Guid LeaveTypeId,
    string LeaveTypeName,
    int Year,
    decimal TotalDays,
    decimal UsedDays,
    decimal PendingDays,
    decimal RemainingDays);
