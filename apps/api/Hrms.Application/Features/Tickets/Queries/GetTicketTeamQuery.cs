using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

/// <summary>ทีมงานที่ยัง active ของใบแจ้งเรื่อง — ใช้กับหน้าจัดทีมที่ไม่ต้องโหลด detail ทั้งใบ</summary>
public record GetTicketTeamQuery(Guid TicketId) : IRequest<IReadOnlyList<TicketTeamMemberDto>>;

public class GetTicketTeamHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetTicketTeamQuery, IReadOnlyList<TicketTeamMemberDto>>
{
    public async Task<IReadOnlyList<TicketTeamMemberDto>> Handle(
        GetTicketTeamQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissions, ticket, ct);
        var actions = await TicketAccess.GetActionFlagsAsync(db, currentUser, permissions, ticket, ct);

        return await db.TicketAssignments.AsNoTracking()
            .Where(assignment => assignment.TicketId == ticket.Id && assignment.IsActive)
            .OrderByDescending(assignment => assignment.IsPrimary)
            .ThenBy(assignment => assignment.AssignedAt)
            .Select(assignment => new TicketTeamMemberDto(
                assignment.Id,
                assignment.AssignedToEmployeeId,
                (assignment.AssignedToEmployee.FirstName + " " + assignment.AssignedToEmployee.LastName).Trim(),
                assignment.AssignedToEmployee.EmployeeCode,
                assignment.AssignedToEmployee.Department != null
                    ? assignment.AssignedToEmployee.Department.Name
                    : null,
                assignment.MemberRole,
                assignment.AssignedAt,
                assignment.AssignedByEmployeeId,
                assignment.AssignedByEmployee != null
                    ? (assignment.AssignedByEmployee.FirstName + " " + assignment.AssignedByEmployee.LastName).Trim()
                    : null,
                assignment.Note,
                actions.CanManageTeam && !assignment.IsPrimary))
            .ToListAsync(ct);
    }
}
