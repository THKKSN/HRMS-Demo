using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;

namespace Hrms.Application.Features.Leaves.Queries.GetCancellationPending;

public record GetCancellationPendingQuery(int Page = 1, int PageSize = 20)
    : IRequest<PagedResult<PendingLeaveItemDto>>;
