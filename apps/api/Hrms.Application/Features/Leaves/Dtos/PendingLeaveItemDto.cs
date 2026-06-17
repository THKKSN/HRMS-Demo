using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Leaves.Dtos;

public record PendingLeaveItemDto(
    Guid Id,
    string EmployeeName,
    string LeaveTypeName,
    DateOnly DateFrom,
    DateOnly DateTo,
    decimal TotalDays,
    LeaveStatus Status,
    DateTime CreatedAt);
