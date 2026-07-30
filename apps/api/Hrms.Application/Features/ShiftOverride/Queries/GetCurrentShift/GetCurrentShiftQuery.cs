using MediatR;

namespace Hrms.Application.Features.ShiftOverride.Queries.GetCurrentShift;

public record GetCurrentShiftQuery(Guid EmployeeId) : IRequest<CurrentShiftDto>;

public record CurrentShiftDto(
    Guid? ShiftId,
    string? ShiftName,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    int? GracePeriodMinutes,
    string Source);   // "override" | "department" | "company" | "none"
