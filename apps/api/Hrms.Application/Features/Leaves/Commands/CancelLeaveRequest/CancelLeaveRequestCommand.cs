using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.CancelLeaveRequest;

public record CancelLeaveRequestCommand(Guid LeaveRequestId) : IRequest<Unit>;
