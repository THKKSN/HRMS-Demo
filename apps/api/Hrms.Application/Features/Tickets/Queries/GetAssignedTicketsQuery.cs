using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetAssignedTicketsQuery(
    TicketStatus? Status,
    string? Search,
    bool History = false,
    int Page = 1,
    int PageSize = 20) : IRequest<PagedResult<AssignedTicketItemDto>>;

public class GetAssignedTicketsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetAssignedTicketsQuery, PagedResult<AssignedTicketItemDto>>
{
    public async Task<PagedResult<AssignedTicketItemDto>> Handle(GetAssignedTicketsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-assigned", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var assignments = db.TicketAssignments.AsNoTracking()
            .Where(a => a.AssignedToEmployeeId == employeeId && (request.History ? !a.IsActive : a.IsActive && a.IsPrimary));
        if (request.Status.HasValue)
            assignments = assignments.Where(a => a.Ticket.Status == request.Status.Value);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            assignments = assignments.Where(a =>
                a.Ticket.TicketNo.ToLower().Contains(search) ||
                a.Ticket.Title.ToLower().Contains(search) ||
                a.Ticket.RequesterEmployee.FirstName.ToLower().Contains(search) ||
                a.Ticket.RequesterEmployee.LastName.ToLower().Contains(search) ||
                (a.Ticket.VehicleText != null && a.Ticket.VehicleText.ToLower().Contains(search)) ||
                (a.Ticket.LocationText != null && a.Ticket.LocationText.ToLower().Contains(search)));
        }

        var totalCount = await assignments.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var items = await assignments
            .OrderBy(a => a.Ticket.Priority == TicketPriority.Critical ? 0 :
                a.Ticket.Priority == TicketPriority.High ? 1 :
                a.Ticket.Priority == TicketPriority.Medium ? 2 : 3)
            .ThenBy(a => a.AssignedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AssignedTicketItemDto(
                a.Ticket.Id,
                a.Ticket.TicketNo,
                a.Ticket.Title,
                a.Ticket.Status,
                a.Ticket.Priority,
                (a.Ticket.RequesterEmployee.FirstName + " " + a.Ticket.RequesterEmployee.LastName).Trim(),
                a.Ticket.Category.Name,
                a.Ticket.Topic.Name,
                a.Ticket.VehicleText,
                a.Ticket.LocationText,
                a.AssignedAt,
                a.Ticket.WorkStartedAt,
                a.Ticket.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<AssignedTicketItemDto>(items, totalCount, page, pageSize);
    }
}
