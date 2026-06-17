namespace Hrms.Application.Features.LeaveTypes.Dtos;

public record LeaveTypeDto(
    Guid Id,
    string Code,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment,
    bool IsActive);
