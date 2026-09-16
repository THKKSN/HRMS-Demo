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
    DateTime? ExpectedUpdatedAt,
    /// <summary>ผู้ดูแลการ์ดนี้ — ต้องเป็นคนในทีมของใบนี้ ไม่ระบุ = ผู้สร้างการ์ดเอง</summary>
    Guid? OwnerEmployeeId = null) : IRequest<TicketActionResultDto>;

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
            .WithErrorCode("TICKET_PROGRESS_ENTRY_TITLE_REQUIRED").WithMessage("A title is required for a completed activity.");
        RuleFor(x => x)
            .Must(x =>
                !string.IsNullOrWhiteSpace(x.WorkState)
                || !string.IsNullOrWhiteSpace(x.BlockerReason)
                || !string.IsNullOrWhiteSpace(x.NextAction)
                || !string.IsNullOrWhiteSpace(x.Note))
            .WithErrorCode("TICKET_PROGRESS_FIELD_REQUIRED").WithMessage("At least one progress field must be filled in.");
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
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureWorkerOrManagerAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status is not (TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("TICKET_PROGRESS_NOT_ALLOWED", "Progress can be updated only while the ticket is in progress or waiting for information.");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        var workState = TrimOrNull(request.WorkState);
        var blockerReason = TrimOrNull(request.BlockerReason);
        var nextAction = TrimOrNull(request.NextAction);
        var note = TrimOrNull(request.Note);
        var ownerEmployeeId = await TicketTeam.ResolveCardOwnerAsync(
            db, ticket.Id, request.OwnerEmployeeId, actorId, ct);

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
            ownerEmployeeId: ownerEmployeeId,
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
            new { workState, blockerReason, nextAction, request.IsCompleted, note, ownerEmployeeId },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt, progressEntry.Id);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
