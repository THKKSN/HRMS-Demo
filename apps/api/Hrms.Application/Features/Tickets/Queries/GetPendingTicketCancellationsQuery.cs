using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetPendingTicketCancellationsQuery(
    string? Search,
    int Page = 1,
    int PageSize = 10) : IRequest<PagedResult<TicketCancellationRequestDto>>;

public class GetPendingTicketCancellationsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetPendingTicketCancellationsQuery, PagedResult<TicketCancellationRequestDto>>
{
    public async Task<PagedResult<TicketCancellationRequestDto>> Handle(
        GetPendingTicketCancellationsQuery request,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, "ticket:view-team", ct);

        var ticketScope = TicketSupervisorAccess.ApplyDepartmentScope(
            db.Tickets.AsNoTracking(), currentUser, db);
        var query = db.TicketCancellationRequests.AsNoTracking()
            .Where(cancellation =>
                cancellation.Status == TicketCancellationStatus.Pending &&
                ticketScope.Any(ticket => ticket.Id == cancellation.TicketId));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(cancellation =>
                cancellation.Ticket.TicketNo.ToLower().Contains(search) ||
                cancellation.Ticket.Title.ToLower().Contains(search) ||
                (cancellation.RequestedByEmployee != null &&
                    (cancellation.RequestedByEmployee.FirstName.ToLower().Contains(search) ||
                     cancellation.RequestedByEmployee.LastName.ToLower().Contains(search))) ||
                (cancellation.Ticket.RequesterNameSnapshot != null &&
                    cancellation.Ticket.RequesterNameSnapshot.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 20);
        var items = await query
            .OrderBy(cancellation => cancellation.RequestedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(cancellation => new TicketCancellationRequestDto(
                cancellation.Id,
                cancellation.TicketId,
                cancellation.Ticket.TicketNo,
                cancellation.Ticket.Title,
                cancellation.RequestedByEmployeeId,
                cancellation.RequestedByEmployee == null
                    ? cancellation.Ticket.RequesterNameSnapshot ?? "External requester"
                    : (cancellation.RequestedByEmployee.FirstName + " " +
                       cancellation.RequestedByEmployee.LastName).Trim(),
                cancellation.Reason,
                cancellation.Status,
                cancellation.RequestedAt,
                cancellation.ReviewedByEmployeeId,
                cancellation.ReviewedByEmployee == null
                    ? null
                    : (cancellation.ReviewedByEmployee.FirstName + " " +
                       cancellation.ReviewedByEmployee.LastName).Trim(),
                cancellation.ReviewedAt,
                cancellation.ReviewNote,
                cancellation.Ticket.TargetCompanyId,
                cancellation.Ticket.TargetCompany.Name,
                cancellation.Ticket.TargetDepartmentId,
                cancellation.Ticket.TargetDepartment.Name,
                cancellation.Ticket.Status,
                cancellation.Ticket.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<TicketCancellationRequestDto>(items, totalCount, page, pageSize);
    }
}
