using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequests;

public record GetLeaveRequestsQuery(
    int Page,
    int PageSize,
    LeaveStatus? Status,
    Guid? EmployeeId) : IRequest<PagedResult<LeaveRequestListItemDto>>;
