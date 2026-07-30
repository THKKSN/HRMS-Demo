using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.RejectLeaveCancellation;

public record RejectLeaveCancellationCommand(Guid LeaveRequestId, string? Comment) : IRequest<Unit>;
