using MediatR;

namespace Hrms.Application.Features.ShiftOverride.Commands.RemoveEmployeeShiftOverride;

public record RemoveEmployeeShiftOverrideCommand(Guid OverrideId) : IRequest<Unit>;
