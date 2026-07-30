using MediatR;

namespace Hrms.Application.Features.ShiftOverride.Commands.SetEmployeeShiftOverride;

public record SetEmployeeShiftOverrideCommand(
    Guid EmployeeId,
    Guid ShiftId,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    string? Reason) : IRequest<Guid>;
