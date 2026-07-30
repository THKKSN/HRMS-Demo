using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Leaves.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Queries.GetLeaveRequests;

public class GetLeaveRequestsHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetLeaveRequestsQuery, PagedResult<LeaveRequestListItemDto>>
{
    public async Task<PagedResult<LeaveRequestListItemDto>> Handle(GetLeaveRequestsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        // ดูการลาของคนอื่นได้เฉพาะคนที่มี leave:view-team
        var canViewTeam = await permService.HasPermissionAsync(currentUser, "leave:view-team", ct);

        var query = db.LeaveRequests
            .Include(r => r.LeaveType)
            .Include(r => r.Employee)
            .AsQueryable();

        if (request.MyOnly || !canViewTeam)
            // "my leave" page หรือไม่มีสิทธิ์ดูทีม → เห็นแค่ของตัวเอง
            query = query.Where(r => r.EmployeeId == employeeId);
        else if (request.EmployeeId.HasValue)
            query = query.Where(r => r.EmployeeId == request.EmployeeId.Value);

        if (request.Status.HasValue)
            query = query.Where(r => r.Status == request.Status.Value);

        if (!string.IsNullOrWhiteSpace(request.EmployeeNameSearch))
        {
            var search = request.EmployeeNameSearch.Trim().ToLower();
            query = query.Where(r =>
                (r.Employee.FirstName + " " + r.Employee.LastName).ToLower().Contains(search));
        }

        if (request.DateFrom.HasValue)
            query = query.Where(r => r.DateFrom >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(r => r.DateTo <= request.DateTo.Value);

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var showEmployeeName = !request.MyOnly && canViewTeam;

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
                r.CreatedAt,
                showEmployeeName ? (r.Employee.FirstName + " " + r.Employee.LastName).Trim() : null))
            .ToListAsync(ct);

        return new PagedResult<LeaveRequestListItemDto>(items, totalCount, page, pageSize);
    }
}
