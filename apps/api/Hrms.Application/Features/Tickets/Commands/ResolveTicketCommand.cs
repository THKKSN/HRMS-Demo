using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record ResolveTicketCommand(Guid TicketId, DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class ResolveTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ResolveTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(ResolveTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.TargetDepartment).ThenInclude(d => d!.ManagerEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        // ส่งตรวจจบงานเป็นของผู้รับผิดชอบหลักคนเดียว ผู้ร่วมงานในทีมทำแทนไม่ได้
        await TicketTeam.EnsureOwnerAsync(db, currentUser, permissions, "ticket:resolve", ticket.Id, ct);
        if (ticket.Status == TicketStatus.Resolved)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.InProgress)
            throw new ConflictException("TICKET_NOT_IN_PROGRESS", "Only tickets that are in progress can be submitted for review.");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var hasEvidence = await db.TicketAttachments.AnyAsync(a =>
            a.TicketId == ticket.Id &&
            a.Stage == TicketAttachmentStage.Resolved, ct);
        // รายละเอียด/รูปบังคับหรือไม่ขึ้นกับ flag ของเหตุผลปิดงานที่เลือก (default บังคับทั้งคู่)
        await TicketCloseoutPolicy.EnsureReadyForReviewAsync(db, ticket, hasEvidence, ct);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        ticket.Status = TicketStatus.Resolved;
        ticket.ResolvedByEmployeeId = actorId;
        ticket.ResolvedAt = now;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "completed_review", workState: "ส่งปิดงานตรวจจบ");
        TicketCommandSupport.AddProgressEntry(
            db,
            ticket,
            actorId,
            "completed_review",
            workState: "ส่งปิดงานตรวจจบ",
            note: ticket.ResolutionNote,
            ownerEmployeeId: actorId);
        ticket.UpdatedBy = actorId;
        TicketStatusTransition.Record(
            db, ticket, TicketStatus.InProgress, TicketStatus.Resolved, actorId, now, "SubmittedForReview");
        var occurrenceId = Guid.NewGuid();
        var templateParams = new { ticketNo = ticket.TicketNo, title = ticket.Title };
        TicketCommandSupport.QueueNotification(
            db, "TicketResolved", occurrenceId, TicketCommandSupport.Requester(ticket),
            "ticket.resolved.toReviewer", templateParams, ticket);
        if (ticket.TargetDepartment is not null)
        {
            TicketCommandSupport.QueueNotification(
                db, "TicketResolved", occurrenceId, ticket.TargetDepartment.ManagerEmployeeId,
                ticket.TargetDepartment.ManagerEmployee?.LineUserId,
                "ticket.resolved.toReviewer", templateParams, ticket);
        }
        await db.SaveChangesAsync(ct);

        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "resolve",
            $"{actorName} ส่งงาน {ticket.TicketNo} ให้ตรวจ",
            new { Status = TicketStatus.InProgress }, new { ticket.Status, ticket.ResolvedAt }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
