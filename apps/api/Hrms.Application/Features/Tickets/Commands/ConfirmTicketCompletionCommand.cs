using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record ConfirmTicketCompletionCommand(Guid TicketId, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class ConfirmTicketCompletionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ConfirmTicketCompletionCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(ConfirmTicketCompletionCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary)).ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("Ticket not found");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (ticket.RequesterEmployeeId != actorId ||
            !await permissions.HasPermissionAsync(currentUser, "ticket:view-own", ct))
            throw new AppForbiddenException("Only the requester can confirm completion");
        if (ticket.Status != TicketStatus.AwaitingRequesterConfirmation)
            throw new ConflictException("INVALID_TICKET_STATUS", "Ticket is not waiting for requester confirmation");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var now = DateTime.UtcNow.AddHours(7);
        var assignment = ticket.Assignments.FirstOrDefault();
        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            if (assignment is not null)
            {
                assignment.IsActive = false;
                assignment.ActiveSlot = null;
                assignment.EndedAt = now;
                assignment.EndedByEmployeeId = actorId;
                assignment.UpdatedBy = actorId;
            }
            ticket.Status = TicketStatus.Closed;
            ticket.ClosedByEmployeeId = actorId;
            ticket.ClosedAt = now;
            TicketCommandSupport.SetWorkflowBoardState(ticket, "closed", workState: "ผู้ร้องขอยืนยันว่าดำเนินการเสร็จสิ้นแล้ว");
            TicketCommandSupport.AddProgressEntry(db, ticket, actorId, "closed", workState: "ผู้ร้องขอยืนยันว่าดำเนินการเสร็จสิ้นแล้ว");
            TicketStatusTransition.Record(db, ticket, TicketStatus.AwaitingRequesterConfirmation, TicketStatus.Closed,
                actorId, now, "RequesterConfirmed", assignment?.Id);
            var message = $"ผู้แจ้งยืนยันปิดงาน {ticket.TicketNo} แล้ว";
            if (assignment is not null)
            {
                TicketCommandSupport.QueueNotification(
                    db, "TicketRequesterConfirmed", ticket.Id, assignment.AssignedToEmployeeId,
                    assignment.AssignedToEmployee.LineUserId, message, ticket);
            }
            TicketCommandSupport.QueueNotification(
                db, "TicketRequesterConfirmed", ticket.Id, TicketCommandSupport.Requester(ticket),
                message, ticket);
            ticket.UpdatedBy = actorId;
            await db.SaveChangesAsync(transactionCt);
        }, ct);

        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "requester-confirm-completion",
            $"{TicketCommandSupport.Requester(ticket).DisplayName} confirmed {ticket.TicketNo}",
            new { Status = TicketStatus.AwaitingRequesterConfirmation }, new { ticket.Status, ticket.ClosedAt }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
