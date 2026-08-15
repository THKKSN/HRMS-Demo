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
            .Include(t => t.TargetDepartment).ThenInclude(d => d.ManagerEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureActiveAssigneeAsync(db, currentUser, permissions, "ticket:resolve", ticket, ct);
        if (ticket.Status == TicketStatus.Resolved)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.InProgress)
            throw new ConflictException("INVALID_TICKET_STATUS", "ส่งงานได้เฉพาะ Ticket ที่กำลังดำเนินการ");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        if (!ticket.ProblemType.HasValue)
            throw new FluentValidation.ValidationException("กรุณาระบุประเภทปัญหา");
        if (string.IsNullOrWhiteSpace(ticket.ResolutionNote))
            throw new FluentValidation.ValidationException("กรุณาระบุรายละเอียดการแก้ไข");
        var hasEvidence = await db.TicketAttachments.AnyAsync(a =>
            a.TicketId == ticket.Id &&
            a.Stage == TicketAttachmentStage.Resolved, ct);
        if (!hasEvidence)
            throw new FluentValidation.ValidationException("กรุณาแนบหลักฐานหลังแก้ไขอย่างน้อย 1 ไฟล์");

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
        var message = $"งาน {ticket.TicketNo} ดำเนินการเสร็จแล้วและรอตรวจรับ\nเรื่อง: {ticket.Title}";
        TicketCommandSupport.QueueNotification(
            db, "TicketResolved", occurrenceId, TicketCommandSupport.Requester(ticket), message, ticket);
        TicketCommandSupport.QueueNotification(
            db, "TicketResolved", occurrenceId, ticket.TargetDepartment.ManagerEmployeeId,
            ticket.TargetDepartment.ManagerEmployee?.LineUserId, message, ticket);
        await db.SaveChangesAsync(ct);

        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "resolve",
            $"{actorName} ส่งงาน {ticket.TicketNo} ให้ตรวจ",
            new { Status = TicketStatus.InProgress }, new { ticket.Status, ticket.ResolvedAt }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
