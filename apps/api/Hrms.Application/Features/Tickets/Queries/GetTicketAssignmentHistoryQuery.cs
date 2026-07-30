using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketAssignmentHistoryQuery(Guid TicketId)
    : IRequest<IReadOnlyList<TicketAssignmentDto>>;

public class GetTicketAssignmentHistoryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetTicketAssignmentHistoryQuery, IReadOnlyList<TicketAssignmentDto>>
{
    public async Task<IReadOnlyList<TicketAssignmentDto>> Handle(
        GetTicketAssignmentHistoryQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:view-team", ticket, ct);

        return await db.TicketAssignments
            .AsNoTracking()
            .Where(a => a.TicketId == request.TicketId)
            .OrderByDescending(a => a.AssignedAt)
            .Select(a => new TicketAssignmentDto(
                a.Id,
                a.TicketId,
                a.AssignedToEmployeeId,
                (a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).Trim(),
                a.AssignedByEmployeeId,
                a.AssignedByEmployee == null ? null :
                    (a.AssignedByEmployee.FirstName + " " + a.AssignedByEmployee.LastName).Trim(),
                a.AssignedAt,
                a.IsPrimary,
                a.IsActive,
                a.EndedAt,
                a.EndedByEmployeeId,
                a.EndedByEmployee == null ? null :
                    (a.EndedByEmployee.FirstName + " " + a.EndedByEmployee.LastName).Trim(),
                a.Note,
                a.AssignmentSource,
                a.ResponsibilityId,
                a.RoutingLevelSnapshot))
            .ToListAsync(ct);
    }
}
