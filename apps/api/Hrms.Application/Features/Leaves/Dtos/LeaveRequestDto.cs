using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Leaves.Dtos;

public record LeaveRequestDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    string LeaveTypeName,
    DateOnly DateFrom,
    DateOnly DateTo,
    HalfDayType HalfDay,
    TimeOnly? TimeFrom,
    TimeOnly? TimeTo,
    decimal TotalDays,
    string? Reason,
    string? AttachmentUrl,
    LeaveStatus Status,
    string? SupervisorComment,
    string? HrComment,
    DateTime CreatedAt);
