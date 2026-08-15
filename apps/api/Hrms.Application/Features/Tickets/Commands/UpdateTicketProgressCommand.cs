using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record UpdateTicketProgressCommand(
    Guid TicketId,
    string? WorkState,
    string? BlockerReason,
    string? NextAction,
    bool IsCompleted,
    string? Note,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class UpdateTicketProgressValidator : AbstractValidator<UpdateTicketProgressCommand>
{
    public UpdateTicketProgressValidator()
    {
        RuleFor(x => x.WorkState).MaximumLength(200);
        RuleFor(x => x.BlockerReason).MaximumLength(200);
        RuleFor(x => x.NextAction).MaximumLength(200);
        RuleFor(x => x.Note).MaximumLength(2000);
        RuleFor(x => x)
            .Must(x => !x.IsCompleted || !string.IsNullOrWhiteSpace(x.WorkState))
            .WithMessage("กรุณาระบุหัวข้อกิจกรรมที่เสร็จสิ้น");
        RuleFor(x => x)
            .Must(x =>
                !string.IsNullOrWhiteSpace(x.WorkState)
                || !string.IsNullOrWhiteSpace(x.BlockerReason)
                || !string.IsNullOrWhiteSpace(x.NextAction)
                || !string.IsNullOrWhiteSpace(x.Note))
            .WithMessage("กรุณาระบุความคืบหน้าอย่างน้อย 1 รายการ");
    }
}

public class UpdateTicketProgressHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketProgressCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(UpdateTicketProgressCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureWorkerOrManagerAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status is not (TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("INVALID_TICKET_STATUS", "อัปเดตความคืบหน้าได้เฉพาะงานที่กำลังดำเนินการหรือรอข้อมูล");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var workState = TrimOrNull(request.WorkState);
        var blockerReason = TrimOrNull(request.BlockerReason);
        var nextAction = TrimOrNull(request.NextAction);
        var note = TrimOrNull(request.Note);

        TicketCommandSupport.SetWorkflowBoardState(
            ticket,
            "in_progress",
            workState,
            blockerReason,
            nextAction);
        var progressEntry = TicketCommandSupport.AddProgressEntry(
            db,
            ticket,
            actorId,
            "in_progress",
            workState,
            blockerReason,
            nextAction,
            note,
            ownerEmployeeId: actorId,
            isCompleted: request.IsCompleted);
        ticket.UpdatedBy = actorId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket",
            "Ticket",
            ticket.Id.ToString(),
            "update-progress",
            $"{TicketCommandSupport.FullName(actor)} อัปเดตบอร์ดงาน {ticket.TicketNo}",
            null,
            new { workState, blockerReason, nextAction, request.IsCompleted, note },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt, progressEntry.Id);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
