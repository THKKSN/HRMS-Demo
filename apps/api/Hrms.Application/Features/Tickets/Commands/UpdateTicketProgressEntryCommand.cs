using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record UpdateTicketProgressEntryCommand(
    Guid TicketId,
    Guid EntryId,
    string? WorkState,
    string? BlockerReason,
    string? NextAction,
    string? Note,
    DateTime? ExpectedUpdatedAt,
    /// <summary>ผู้ดูแลการ์ดนี้ — ต้องเป็นคนในทีมของใบนี้ ไม่ระบุ = คงค่าเดิม</summary>
    Guid? OwnerEmployeeId = null) : IRequest<TicketActionResultDto>;

public class UpdateTicketProgressEntryValidator : AbstractValidator<UpdateTicketProgressEntryCommand>
{
    public UpdateTicketProgressEntryValidator()
    {
        RuleFor(x => x.WorkState).MaximumLength(200);
        RuleFor(x => x.BlockerReason).MaximumLength(200);
        RuleFor(x => x.NextAction).MaximumLength(200);
        RuleFor(x => x.Note).MaximumLength(2000);
        RuleFor(x => x)
            .Must(x =>
                !string.IsNullOrWhiteSpace(x.WorkState)
                || !string.IsNullOrWhiteSpace(x.BlockerReason)
                || !string.IsNullOrWhiteSpace(x.NextAction)
                || !string.IsNullOrWhiteSpace(x.Note))
            .WithErrorCode("TICKET_PROGRESS_FIELD_REQUIRED").WithMessage("At least one progress field must be filled in.");
    }
}

/// <summary>
/// แก้ไขการ์ดกิจกรรมที่สร้างไว้แล้วในบอร์ด (หัวข้อ/ประเภท/รายละเอียด) — ไม่สร้างการ์ดใหม่และไม่เปลี่ยนสถานะ Ticket
/// สิทธิ์ 2 ชั้น: (1) permission `ticket:edit-progress-entry` = แก้ได้เฉพาะการ์ดที่ตนเองสร้าง,
/// `ticket:edit-any-progress-entry` = แก้ได้ทุกใบ (ตั้งค่าได้จาก permission matrix)
/// (2) ต้องเกี่ยวข้องกับใบแจ้งเรื่องนี้จริง: ผู้รับผิดชอบปัจจุบัน / หัวหน้าแผนกปลายทาง / Admin (กติการะบบ ไม่ตั้งค่า)
/// </summary>
public class UpdateTicketProgressEntryHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketProgressEntryCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(UpdateTicketProgressEntryCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        // ชั้น permission (Admin ได้ทุก code เสมอผ่าน IPermissionService)
        var canEditAny = await permissions.HasPermissionAsync(currentUser, TicketAccess.EditAnyProgressEntryPermission, ct);
        var canEditOwn = canEditAny
            || await permissions.HasPermissionAsync(currentUser, TicketAccess.EditProgressEntryPermission, ct);
        if (!canEditOwn)
            throw new AppForbiddenException("TICKET_PROGRESS_ENTRY_FORBIDDEN", "You are not allowed to edit activity cards on this ticket.");
        // ชั้นความเกี่ยวข้องกับใบแจ้งเรื่อง
        await TicketAccess.EnsureWorkerOrManagerRelationAsync(db, currentUser, ticket, ct);
        if (ticket.Status is not (TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("TICKET_PROGRESS_ENTRY_NOT_EDITABLE", "Cards can be edited only while the ticket is in progress or waiting for information.");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var entry = await db.TicketProgressEntries
            .FirstOrDefaultAsync(e => e.Id == request.EntryId && e.TicketId == ticket.Id, ct)
            ?? throw new NotFoundException("TicketProgressEntry", request.EntryId, "TICKET_PROGRESS_ENTRY_NOT_FOUND");
        if (entry.WorkflowStepKey != TicketCommandSupport.InProgressStepKey)
            throw new ConflictException("PROGRESS_ENTRY_LOCKED", "Only cards in the working stage can be edited.");

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (!canEditAny && entry.CreatedByEmployeeId != actorId)
            throw new AppForbiddenException("TICKET_PROGRESS_ENTRY_OWN_ONLY", "Your permissions allow editing only the cards you created.");

        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var workState = TrimOrNull(request.WorkState);
        var blockerReason = TrimOrNull(request.BlockerReason);
        var nextAction = TrimOrNull(request.NextAction);
        var note = TrimOrNull(request.Note);
        if (entry.IsCompleted && workState is null)
            throw new BadRequestException("TICKET_PROGRESS_ENTRY_TITLE_REQUIRED", "A title is required for a completed activity.");

        var before = new { entry.WorkState, entry.BlockerReason, entry.NextAction, entry.Note, entry.OwnerEmployeeId };
        if (request.OwnerEmployeeId.HasValue)
        {
            entry.OwnerEmployeeId = await TicketTeam.ResolveCardOwnerAsync(
                db, ticket.Id, request.OwnerEmployeeId, actorId, ct);
        }
        entry.WorkState = workState;
        entry.BlockerReason = blockerReason;
        entry.NextAction = nextAction;
        entry.Note = note;
        entry.UpdatedBy = actorId;

        // การ์ดล่าสุดเป็นตัวกำหนด CurrentWorkState/BlockerReason/NextAction ของ Ticket — แก้แล้วต้อง sync ตาม
        var isLatestEntry = !await db.TicketProgressEntries.AnyAsync(other =>
            other.TicketId == ticket.Id && other.Id != entry.Id && other.CreatedAt > entry.CreatedAt, ct);
        if (isLatestEntry && ticket.WorkflowCurrentStepKey == entry.WorkflowStepKey)
        {
            TicketCommandSupport.SetWorkflowBoardState(
                ticket,
                entry.WorkflowStepKey,
                workState,
                blockerReason,
                nextAction);
        }
        ticket.UpdatedBy = actorId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket",
            "Ticket",
            ticket.Id.ToString(),
            "update-progress-entry",
            $"{TicketCommandSupport.FullName(actor)} แก้ไขการ์ดกิจกรรมใน {ticket.TicketNo}",
            before,
            new { entry.Id, entry.WorkState, entry.BlockerReason, entry.NextAction, entry.Note },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt, entry.Id);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
