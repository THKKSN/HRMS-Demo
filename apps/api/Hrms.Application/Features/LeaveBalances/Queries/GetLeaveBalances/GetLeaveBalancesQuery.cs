using Hrms.Application.Common.Models;
using Hrms.Application.Features.LeaveBalances.Dtos;
using MediatR;

namespace Hrms.Application.Features.LeaveBalances.Queries.GetLeaveBalances;

public record GetLeaveBalancesQuery(
    int Page,
    int PageSize,
    int Year,
    Guid? EmployeeId) : IRequest<PagedResult<LeaveBalanceAdminDto>>;
