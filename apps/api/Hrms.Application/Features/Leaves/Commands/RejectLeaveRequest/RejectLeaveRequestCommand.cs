using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.RejectLeaveRequest;

public record RejectLeaveRequestCommand(Guid LeaveRequestId, string? Comment) : IRequest<Unit>;
