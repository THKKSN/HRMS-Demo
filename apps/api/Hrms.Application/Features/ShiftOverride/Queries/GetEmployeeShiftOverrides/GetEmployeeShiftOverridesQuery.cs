using MediatR;

namespace Hrms.Application.Features.ShiftOverride.Queries.GetEmployeeShiftOverrides;

public record GetEmployeeShiftOverridesQuery(Guid EmployeeId) : IRequest<List<ShiftOverrideDto>>;

public record ShiftOverrideDto(
    Guid Id,
    Guid ShiftId,
    string ShiftName,
    TimeOnly StartTime,
    TimeOnly EndTime,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    string? Reason,
    bool IsActive,
    DateTime CreatedAt);
