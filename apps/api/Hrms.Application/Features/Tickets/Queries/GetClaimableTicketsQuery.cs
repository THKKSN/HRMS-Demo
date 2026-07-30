using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetClaimableTicketsQuery(
    string? Search,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<AssignedTicketItemDto>>;

public class GetClaimableTicketsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetClaimableTicketsQuery, PagedResult<AssignedTicketItemDto>>
{
    public async Task<PagedResult<AssignedTicketItemDto>> Handle(
        GetClaimableTicketsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-assigned", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        var query = db.Tickets.AsNoTracking().Where(t =>
            t.Status == TicketStatus.Open &&
            !t.Assignments.Any(a => a.IsActive && a.IsPrimary) &&
            db.EmployeeResponsibilities.Any(r =>
                r.EmployeeId == employeeId && r.CompanyId == t.TargetCompanyId &&
                r.DepartmentId == t.TargetDepartmentId && r.CategoryId == t.CategoryId &&
                (r.TopicId == null || r.TopicId == t.TopicId) && r.IsActive &&
                (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= today) &&
                (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= today) &&
                r.Employee.IsActive && r.Employee.CompanyId == t.TargetCompanyId &&
                r.Employee.DepartmentId == t.TargetDepartmentId));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(t =>
                t.TicketNo.ToLower().Contains(search) ||
                t.Title.ToLower().Contains(search) ||
                t.RequesterEmployee.FirstName.ToLower().Contains(search) ||
                t.RequesterEmployee.LastName.ToLower().Contains(search) ||
                (t.VehicleText != null && t.VehicleText.ToLower().Contains(search)) ||
                (t.LocationText != null && t.LocationText.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var items = await query
            .OrderBy(t => t.Priority == TicketPriority.Critical ? 0 :
                t.Priority == TicketPriority.High ? 1 :
                t.Priority == TicketPriority.Medium ? 2 : 3)
            .ThenBy(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AssignedTicketItemDto(
                t.Id,
                t.TicketNo,
                t.Title,
                t.Status,
                t.Priority,
                (t.RequesterEmployee.FirstName + " " + t.RequesterEmployee.LastName).Trim(),
                t.Category.Name,
                t.Topic.Name,
                t.VehicleText,
                t.LocationText,
                t.CreatedAt,
                t.WorkStartedAt,
                t.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<AssignedTicketItemDto>(items, totalCount, page, pageSize);
    }
}
