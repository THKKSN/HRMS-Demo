using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetPendingApprovals;

public class GetPendingApprovalsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetPendingApprovalsQuery, PagedResult<PendingLeaveItemDto>>
{
    public async Task<PagedResult<PendingLeaveItemDto>> Handle(GetPendingApprovalsQuery request, CancellationToken ct)
    {
        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        LeaveStatus pendingStatus;

        if (currentUser.IsAdminOrHr())
            pendingStatus = LeaveStatus.PendingHr;
        else if (currentUser.IsSupervisorOrAbove())
            pendingStatus = LeaveStatus.PendingSupervisor;
        else
            throw new AppForbiddenException("ต้องมีสิทธิ์ Supervisor หรือ HR จึงจะดูรายการรออนุมัติได้");

        var query = db.LeaveRequests
            .Include(r => r.LeaveType)
            .Include(r => r.Employee)
            .Where(r => r.Status == pendingStatus && r.Employee.CompanyId == companyId);

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderBy(r => r.CreatedAt)
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
                r.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<PendingLeaveItemDto>(items, totalCount, page, pageSize);
    }
}
