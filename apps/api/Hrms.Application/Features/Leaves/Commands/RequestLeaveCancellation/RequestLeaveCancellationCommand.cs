using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.RequestLeaveCancellation;

public record RequestLeaveCancellationCommand(Guid LeaveRequestId, string? Reason) : IRequest<Unit>;
