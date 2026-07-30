using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetCancellationPending;

public class GetCancellationPendingHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IScopeGuard scope)
    : IRequestHandler<GetCancellationPendingQuery, PagedResult<PendingLeaveItemDto>>
{
    public async Task<PagedResult<PendingLeaveItemDto>> Handle(GetCancellationPendingQuery request, CancellationToken ct)
    {
        var canApproveHr = await permService.HasPermissionAsync(currentUser, "leave:approve-hr", ct);
        if (!canApproveHr)
            throw new AppForbiddenException("ต้องมีสิทธิ์ HR จึงจะดูรายการขอยกเลิกได้");

        var accessibleIds = await scope.GetAccessibleCompanyIdsAsync(ct);

        var query = db.LeaveRequests
            .Include(r => r.LeaveType)
            .Include(r => r.Employee)
            .Where(r => r.Status == LeaveStatus.CancellationRequested);

        if (accessibleIds != null)
            query = query.Where(r => accessibleIds.Contains(r.Employee.CompanyId));

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderBy(r => r.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new PendingLeaveItemDto(
                r.Id,
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.LeaveType.NameTh,
                r.DateFrom,
                r.DateTo,
                r.TotalDays,
                r.Status,
                r.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<PendingLeaveItemDto>(items, totalCount, page, pageSize);
    }
}
