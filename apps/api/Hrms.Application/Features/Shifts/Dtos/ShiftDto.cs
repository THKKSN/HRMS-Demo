namespace Hrms.Application.Features.Shifts.Dtos;

public record ShiftDto(
    Guid Id,
    Guid CompanyId,
    string CompanyName,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int GracePeriodMinutes,
    bool IsActive);
