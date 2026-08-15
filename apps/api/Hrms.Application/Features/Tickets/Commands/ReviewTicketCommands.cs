using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record ReturnTicketForRevisionCommand(Guid TicketId, string ReviewNote, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class ReturnTicketForRevisionValidator : AbstractValidator<ReturnTicketForRevisionCommand>
{
    public ReturnTicketForRevisionValidator() => RuleFor(x => x.ReviewNote).NotEmpty().MaximumLength(2000);
}

public class ReturnTicketForRevisionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ReturnTicketForRevisionCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(ReturnTicketForRevisionCommand request, CancellationToken ct)
    {
        var ticket = await LoadTicket(request.TicketId, ct);
        await TicketSupervisorAccess.EnsureTicketAsync(db, currentUser, permissions, "ticket:return", ticket, ct);
        if (ticket.Status != TicketStatus.Resolved)
            throw new ConflictException("INVALID_TICKET_STATUS", "ส่งกลับแก้ไขได้เฉพาะ Ticket ที่รอตรวจ");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var assignment = ticket.Assignments.FirstOrDefault()
            ?? throw new ConflictException("ASSIGNMENT_CHANGED", "ไม่พบผู้รับผิดชอบปัจจุบัน");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        var review = await CreateReview(ticket, TicketReviewDecision.Returned, request.ReviewNote.Trim(), actorId, now, ct);
        var previousResolvedByEmployeeId = ticket.ResolvedByEmployeeId;
        var previousResolvedAt = ticket.ResolvedAt;

        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            db.TicketReviews.Add(review);
            ticket.Status = TicketStatus.InProgress;
            ticket.ResolvedByEmployeeId = null;
            ticket.ResolvedAt = null;
            TicketCommandSupport.SetWorkflowBoardState(
                ticket,
                "in_progress",
                workState: "รอแก้ไขตามผลตรวจ",
                blockerReason: "รอแก้ไขตามผลตรวจ",
                nextAction: "ปรับแก้และส่งตรวจใหม่");
            TicketCommandSupport.AddProgressEntry(
                db,
                ticket,
                actorId,
                "in_progress",
                workState: "รอแก้ไขตามผลตรวจ",
                blockerReason: "รอแก้ไขตามผลตรวจ",
                nextAction: "ปรับแก้และส่งตรวจใหม่",
                note: review.ReviewNote,
                ownerEmployeeId: assignment.AssignedToEmployeeId);
            ticket.UpdatedBy = actorId;
            TicketStatusTransition.Record(db, ticket, TicketStatus.Resolved, TicketStatus.InProgress,
                actorId, now, request.ReviewNote, assignment.Id);
            var message = $"งาน {ticket.TicketNo} ถูกส่งกลับแก้ไข\nเหตุผล: {review.ReviewNote}";
            TicketCommandSupport.QueueNotification(
                db, "TicketReturned", review.Id, assignment.AssignedToEmployeeId,
                assignment.AssignedToEmployee.LineUserId, message, ticket);
            TicketCommandSupport.QueueNotification(
                db, "TicketReturned", review.Id, TicketCommandSupport.Requester(ticket), message, ticket);
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "return-for-revision",
                $"{TicketCommandSupport.FullName(actor)} ส่ง {ticket.TicketNo} กลับแก้ไขรอบที่ {review.ReviewRound}",
                new { Status = TicketStatus.Resolved, ResolvedByEmployeeId = previousResolvedByEmployeeId, ResolvedAt = previousResolvedAt },
                new { ticket.Status, review.ReviewRound, review.ReviewNote }, transactionCt);
        }, ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }

    private async Task<Ticket> LoadTicket(Guid id, CancellationToken ct)
        => await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Attachments)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary)).ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");

    private async Task<TicketReview> CreateReview(
        Ticket ticket, TicketReviewDecision decision, string? note, Guid actorId, DateTime now, CancellationToken ct)
    {
        var round = await db.TicketReviews.Where(r => r.TicketId == ticket.Id)
            .Select(r => (int?)r.ReviewRound).MaxAsync(ct) ?? 0;
        return new TicketReview
        {
            TicketId = ticket.Id, ReviewRound = round + 1, Decision = decision, ReviewNote = note,
            ReviewedByEmployeeId = actorId, ReviewedAt = now,
            ResolvedByEmployeeId = ticket.ResolvedByEmployeeId, ResolvedAt = ticket.ResolvedAt,
            ProblemTypeSnapshot = ticket.ProblemType,
            InitialInspectionSnapshot = ticket.InitialInspectionNote,
            ResolutionSnapshot = ticket.ResolutionNote,
            ResolvedAttachmentIdsJson = JsonSerializer.Serialize(ticket.Attachments
                .Where(a => a.Stage == TicketAttachmentStage.Resolved).Select(a => a.Id).ToList()),
            CreatedBy = actorId, UpdatedBy = actorId
        };
    }
}

public record CloseTicketCommand(Guid TicketId, string? ReviewNote, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class CloseTicketValidator : AbstractValidator<CloseTicketCommand>
{
    public CloseTicketValidator() => RuleFor(x => x.ReviewNote).MaximumLength(2000);
}

public class CloseTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<CloseTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(CloseTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Attachments)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary)).ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(db, currentUser, permissions, "ticket:close", ticket, ct);
        if (ticket.Status is TicketStatus.AwaitingRequesterConfirmation or TicketStatus.Closed)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.Resolved)
            throw new ConflictException("INVALID_TICKET_STATUS", "ปิดได้เฉพาะ Ticket ที่รอตรวจ");
        if (await db.TicketCancellationRequests.AnyAsync(cancellation =>
            cancellation.TicketId == ticket.Id &&
            cancellation.Status == TicketCancellationStatus.Pending, ct))
            throw new ConflictException(
                "CANCELLATION_PENDING",
                "กรุณาพิจารณาคำขอยกเลิกก่อนปิด Ticket");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        if (!ticket.ProblemType.HasValue || string.IsNullOrWhiteSpace(ticket.ResolutionNote) ||
            !ticket.Attachments.Any(a => a.Stage == TicketAttachmentStage.Resolved))
            throw new ValidationException("ข้อมูลผลการแก้ไขหรือหลักฐานจบงานไม่ครบ");

        var assignment = ticket.Assignments.FirstOrDefault()
            ?? throw new ConflictException("ASSIGNMENT_CHANGED", "ไม่พบผู้รับผิดชอบปัจจุบัน");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        var round = await db.TicketReviews.Where(r => r.TicketId == ticket.Id)
            .Select(r => (int?)r.ReviewRound).MaxAsync(ct) ?? 0;
        var review = new TicketReview
        {
            TicketId = ticket.Id, ReviewRound = round + 1, Decision = TicketReviewDecision.Approved,
            ReviewNote = string.IsNullOrWhiteSpace(request.ReviewNote) ? null : request.ReviewNote.Trim(),
            ReviewedByEmployeeId = actorId, ReviewedAt = now,
            ResolvedByEmployeeId = ticket.ResolvedByEmployeeId, ResolvedAt = ticket.ResolvedAt,
            ProblemTypeSnapshot = ticket.ProblemType,
            InitialInspectionSnapshot = ticket.InitialInspectionNote,
            ResolutionSnapshot = ticket.ResolutionNote,
            ResolvedAttachmentIdsJson = JsonSerializer.Serialize(ticket.Attachments
                .Where(a => a.Stage == TicketAttachmentStage.Resolved).Select(a => a.Id).ToList()),
            CreatedBy = actorId, UpdatedBy = actorId
        };

        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            db.TicketReviews.Add(review);
            ticket.Status = TicketStatus.AwaitingRequesterConfirmation;
            ticket.VerifiedByEmployeeId = actorId;
            ticket.VerifiedAt = now;
            TicketCommandSupport.SetWorkflowBoardState(ticket, "accepted", workState: "ปิดงานเรียบร้อย");
            TicketCommandSupport.AddProgressEntry(
                db,
                ticket,
                actorId,
                "accepted",
                workState: "ปิดงานเรียบร้อย",
                note: review.ReviewNote ?? "Approved",
                ownerEmployeeId: ticket.RequesterEmployeeId);
            ticket.UpdatedBy = actorId;
            TicketStatusTransition.Record(db, ticket, TicketStatus.Resolved, TicketStatus.AwaitingRequesterConfirmation,
                actorId, now, review.ReviewNote ?? "Approved", assignment.Id);
            var message = $"งาน {ticket.TicketNo} ผ่านการตรวจและปิดแล้ว";
            TicketCommandSupport.QueueNotification(
                db, "TicketClosed", review.Id, assignment.AssignedToEmployeeId,
                assignment.AssignedToEmployee.LineUserId, message, ticket);
            TicketCommandSupport.QueueNotification(
                db, "TicketClosed", review.Id, TicketCommandSupport.Requester(ticket), message, ticket);
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "close",
                $"{TicketCommandSupport.FullName(actor)} ตรวจผ่านและปิด {ticket.TicketNo}",
                new { Status = TicketStatus.Resolved },
                new { ticket.Status, review.ReviewRound, ticket.VerifiedAt }, transactionCt);
        }, ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
