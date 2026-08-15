using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketCommentsQuery(Guid TicketId) : IRequest<IReadOnlyList<TicketCommentDto>>;

public class GetTicketCommentsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketCommentsQuery, IReadOnlyList<TicketCommentDto>>
{
    public async Task<IReadOnlyList<TicketCommentDto>> Handle(GetTicketCommentsQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        var isRequester = currentUser.EmployeeId == ticket.RequesterEmployeeId;
        var canSeeInternal = !isRequester &&
            await permissions.HasPermissionAsync(currentUser, "ticket:add-internal-note", ct) &&
            (currentUser.HasRole(RoleType.Admin) ||
                await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct));

        return await db.TicketComments.AsNoTracking()
            .Where(c => c.TicketId == ticket.Id && (canSeeInternal || !c.IsInternal))
            .OrderBy(c => c.CreatedAt)
            .Select(c => new TicketCommentDto(
                c.Id, c.TicketId, c.EmployeeId, c.ExternalReporterId,
                c.Employee == null
                    ? c.Ticket.RequesterNameSnapshot ?? "External requester"
                    : (c.Employee.FirstName + " " + c.Employee.LastName).Trim(),
                c.CommentType, c.Message, c.IsInternal, c.CreatedAt))
            .ToListAsync(ct);
    }
}
