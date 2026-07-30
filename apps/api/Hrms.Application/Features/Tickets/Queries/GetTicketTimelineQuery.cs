using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketTimelineQuery(Guid TicketId) : IRequest<IReadOnlyList<TicketTimelineEventDto>>;

public class GetTicketTimelineHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketTimelineQuery, IReadOnlyList<TicketTimelineEventDto>>
{
    private static readonly string[] PublicAuditActions =
    [
        "accept",
        "assign",
        "reassign",
        "reassign-after-start",
        "claim",
        "start-work",
        "request-info",
        "resume-work",
        "resolve",
        "return-for-revision",
        "close",
        "reject",
        "request-cancellation",
        "approve-cancellation",
        "reject-cancellation"
    ];

    public async Task<IReadOnlyList<TicketTimelineEventDto>> Handle(GetTicketTimelineQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        var isRequester = currentUser.EmployeeId == ticket.RequesterEmployeeId;
        var canSeeInternal = !isRequester &&
            await permissions.HasPermissionAsync(currentUser, "ticket:add-internal-note", ct) &&
            (currentUser.HasRole(RoleType.Admin) ||
                await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct));

        var audit = await db.AuditLogs.AsNoTracking()
            .Where(a => a.Module == "ticket" &&
                a.EntityId == ticket.Id.ToString() &&
                PublicAuditActions.Contains(a.Action))
            .Select(a => new TicketTimelineEventDto(
                a.Id.ToString(), "Audit", a.Action, a.Description,
                a.PerformedByEmployeeId, a.PerformedByName, false, a.CreatedAt))
            .ToListAsync(ct);
        var comments = await db.TicketComments.AsNoTracking()
            .Where(c => c.TicketId == ticket.Id && (canSeeInternal || !c.IsInternal))
            .Select(c => new TicketTimelineEventDto(
                c.Id.ToString(), "Comment", c.CommentType.ToString(), c.Message,
                c.EmployeeId, (c.Employee.FirstName + " " + c.Employee.LastName).Trim(),
                c.IsInternal, c.CreatedAt))
            .ToListAsync(ct);

        return audit.Concat(comments).OrderBy(e => e.CreatedAt).ToList();
    }
}
