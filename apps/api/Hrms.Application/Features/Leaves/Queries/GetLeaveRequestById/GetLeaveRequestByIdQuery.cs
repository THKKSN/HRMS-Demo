using Hrms.Application.Features.Leaves.Dtos;
using MediatR;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequestById;

public record GetLeaveRequestByIdQuery(Guid Id) : IRequest<LeaveRequestDto>;
