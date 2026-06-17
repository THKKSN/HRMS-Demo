using Hrms.Application.Features.Leaves.Dtos;
using MediatR;

namespace Hrms.Application.Features.Leaves.Commands.ApproveLeaveRequest;

public record ApproveLeaveRequestCommand(Guid LeaveRequestId, string? Comment) : IRequest<LeaveRequestDto>;
