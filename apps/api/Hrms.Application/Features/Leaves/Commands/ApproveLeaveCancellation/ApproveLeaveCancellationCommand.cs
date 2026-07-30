using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.ApproveLeaveCancellation;

public record ApproveLeaveCancellationCommand(Guid LeaveRequestId, string? Comment) : IRequest<Unit>;
