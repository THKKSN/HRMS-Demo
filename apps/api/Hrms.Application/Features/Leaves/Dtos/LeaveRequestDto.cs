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
    IReadOnlyList<string> AttachmentUrls,
    LeaveStatus Status,
    string? SupervisorName,
    string? SupervisorComment,
    string? HrName,
    string? HrComment,
    DateTime CreatedAt);
