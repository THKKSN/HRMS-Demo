using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record StartTicketWorkCommand(Guid TicketId, DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class StartTicketWorkHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<StartTicketWorkCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(StartTicketWorkCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureActiveAssigneeAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status == TicketStatus.InProgress)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.Assigned)
            throw new ConflictException("INVALID_TICKET_STATUS", "เริ่มงานได้เฉพาะ Ticket ที่มอบหมายแล้ว");

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        ticket.Status = TicketStatus.InProgress;
        ticket.WorkStartedByEmployeeId = actorId;
        ticket.WorkStartedAt = now;
        ticket.WaitingInfoByEmployeeId = null;
        ticket.WaitingInfoAt = null;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "in_progress", workState: "เริ่มดำเนินการ");
        TicketCommandSupport.AddProgressEntry(
            db,
            ticket,
            actorId,
            "in_progress",
            workState: "เริ่มดำเนินการ",
            note: "Work Started",
            ownerEmployeeId: actorId);
        ticket.UpdatedBy = actorId;
        TicketStatusTransition.Record(
            db, ticket, TicketStatus.Assigned, TicketStatus.InProgress, actorId, now, "WorkStarted");
        TicketCommandSupport.QueueNotification(
            db, "TicketStarted", Guid.NewGuid(), TicketCommandSupport.Requester(ticket),
            $"ทีมเริ่มดำเนินการ {ticket.TicketNo} แล้ว\nเรื่อง: {ticket.Title}", ticket);
        await db.SaveChangesAsync(ct);

        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "start-work",
            $"{actorName} เริ่มดำเนินการ {ticket.TicketNo}",
            new { Status = TicketStatus.Assigned }, new { ticket.Status, ticket.WorkStartedAt }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
