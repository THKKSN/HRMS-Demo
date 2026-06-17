using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Leaves.Dtos;

public record LeaveRequestListItemDto(
    Guid Id,
    string LeaveTypeName,
    DateOnly DateFrom,
    DateOnly DateTo,
    decimal TotalDays,
    LeaveStatus Status,
    DateTime CreatedAt);
