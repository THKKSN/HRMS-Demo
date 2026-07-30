using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record UpdateTicketWorkDetailCommand(
    Guid TicketId,
    TicketProblemType? ProblemType,
    string? InitialInspectionNote,
    string? ResolutionNote,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class UpdateTicketWorkDetailValidator : AbstractValidator<UpdateTicketWorkDetailCommand>
{
    public UpdateTicketWorkDetailValidator()
    {
        RuleFor(x => x.InitialInspectionNote).MaximumLength(2000);
        RuleFor(x => x.ResolutionNote).MaximumLength(2000);
    }
}

public class UpdateTicketWorkDetailHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketWorkDetailCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(UpdateTicketWorkDetailCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketAccess.EnsureActiveAssigneeAsync(db, currentUser, permissions, "ticket:update-status", ticket, ct);
        if (ticket.Status is not (TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("INVALID_TICKET_STATUS", "สถานะปัจจุบันไม่อนุญาตให้บันทึกข้อมูลการทำงาน");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var old = new { ticket.ProblemType, ticket.InitialInspectionNote, ticket.ResolutionNote };
        ticket.ProblemType = request.ProblemType;
        ticket.InitialInspectionNote = TrimOrNull(request.InitialInspectionNote);
        ticket.ResolutionNote = TrimOrNull(request.ResolutionNote);
        ticket.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);
        await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), "update-work-detail",
            $"อัปเดตข้อมูลการดำเนินงาน {ticket.TicketNo}", old,
            new { ticket.ProblemType, ticket.InitialInspectionNote, ticket.ResolutionNote }, ct);
        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
