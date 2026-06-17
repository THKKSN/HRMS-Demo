using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequests;

public class GetLeaveRequestsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetLeaveRequestsQuery, PagedResult<LeaveRequestListItemDto>>
{
    public async Task<PagedResult<LeaveRequestListItemDto>> Handle(GetLeaveRequestsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var isPrivileged = currentUser.IsSupervisorOrAbove();

        var query = db.LeaveRequests
            .Include(r => r.LeaveType)
            .AsQueryable();

        if (!isPrivileged)
            query = query.Where(r => r.EmployeeId == employeeId);
        else if (request.EmployeeId.HasValue)
            query = query.Where(r => r.EmployeeId == request.EmployeeId.Value);

        if (request.Status.HasValue)
            query = query.Where(r => r.Status == request.Status.Value);

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new LeaveRequestListItemDto(
                r.Id,
                r.LeaveType.NameTh,
                r.DateFrom,
                r.DateTo,
                r.TotalDays,
                r.Status,
                r.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<LeaveRequestListItemDto>(items, totalCount, page, pageSize);
    }
}
