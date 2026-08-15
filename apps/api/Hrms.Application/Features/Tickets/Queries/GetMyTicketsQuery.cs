using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetMyTicketsQuery(
    TicketStatus? Status,
    string? Search,
    DateOnly? DateFrom,
    DateOnly? DateTo,
    int Page = 1,
    int PageSize = 10) : IRequest<PagedResult<MyTicketItemDto>>;

public class GetMyTicketsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetMyTicketsQuery, PagedResult<MyTicketItemDto>>
{
    public async Task<PagedResult<MyTicketItemDto>> Handle(GetMyTicketsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, "ticket:view-own", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var query = db.Tickets.AsNoTracking()
            .Where(ticket => ticket.RequesterEmployeeId == employeeId);

        if (request.Status.HasValue)
            query = query.Where(ticket => ticket.Status == request.Status.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(ticket =>
                ticket.TicketNo.ToLower().Contains(search) ||
                ticket.Title.ToLower().Contains(search) ||
                ticket.Detail.ToLower().Contains(search));
        }

        if (request.DateFrom.HasValue)
        {
            var from = request.DateFrom.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(ticket => ticket.CreatedAt >= from);
        }

        if (request.DateTo.HasValue)
        {
            var toExclusive = request.DateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(ticket => ticket.CreatedAt < toExclusive);
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 20);
        var items = await query
            .OrderByDescending(ticket => ticket.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ticket => new MyTicketItemDto(
                ticket.Id,
                ticket.TicketNo,
                ticket.Title,
                ticket.Status,
                ticket.Priority,
                new TicketRequesterDto(
                    ticket.RequestType,
                    ticket.RequesterEmployeeId,
                    ticket.ExternalReporterId,
                    ticket.RequesterEmployee != null
                        ? (ticket.RequesterEmployee.FirstName + " " + ticket.RequesterEmployee.LastName).Trim()
                        : ticket.RequesterNameSnapshot ?? "Employee requester",
                    null,
                    null,
                    ticket.RequesterOrganizationSnapshot ??
                        (ticket.SourceCompany != null ? ticket.SourceCompany.Name : null)),
                ticket.TargetCompany.Name,
                ticket.TargetDepartment.Name,
                ticket.Category.Name,
                ticket.Topic.Name,
                ticket.OtherTopicText,
                ticket.Assignments
                    .Where(assignment => assignment.IsPrimary)
                    .OrderByDescending(assignment => assignment.IsActive)
                    .ThenByDescending(assignment => assignment.AssignedAt)
                    .Select(assignment =>
                        (assignment.AssignedToEmployee.FirstName + " " +
                         assignment.AssignedToEmployee.LastName).Trim())
                    .FirstOrDefault(),
                ticket.CancellationRequests.Any(cancellation =>
                    cancellation.Status == TicketCancellationStatus.Pending),
                ticket.CreatedAt,
                ticket.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<MyTicketItemDto>(items, totalCount, page, pageSize);
    }
}
