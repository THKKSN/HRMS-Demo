using Hrms.Domain.Enums;

namespace Hrms.Application.Features.OtRequests.Dtos;

public record OtRequestDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    string? DepartmentName,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    decimal TotalHours,
    OtRateType RateType,
    string? Reason,
    OtStatus Status,
    string? SupervisorName,
    string? SupervisorComment,
    DateTime? SupervisorApprovedAt,
    string? HrName,
    string? HrComment,
    DateTime? HrAcknowledgedAt,
    DateTime CreatedAt);
