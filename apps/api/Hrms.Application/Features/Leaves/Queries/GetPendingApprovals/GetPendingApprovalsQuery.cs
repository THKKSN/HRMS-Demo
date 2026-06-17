using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;

namespace Hrms.Application.Features.Leaves.Queries.GetPendingApprovals;

public record GetPendingApprovalsQuery(int Page, int PageSize) : IRequest<PagedResult<PendingLeaveItemDto>>;
