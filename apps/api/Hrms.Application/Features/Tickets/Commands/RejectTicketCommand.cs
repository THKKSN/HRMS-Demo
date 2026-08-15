using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record RejectTicketCommand(Guid TicketId, string Reason, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class RejectTicketValidator : AbstractValidator<RejectTicketCommand>
{
    public RejectTicketValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

public class RejectTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<RejectTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(RejectTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
                .ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:update-status", ticket, ct);
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned))
            throw new ConflictException("INVALID_TICKET_STATUS", "ปฏิเสธได้เฉพาะใบแจ้งเรื่องที่ยังไม่เริ่มดำเนินการ");
        if (await db.TicketCancellationRequests.AnyAsync(cancellation =>
            cancellation.TicketId == ticket.Id &&
            cancellation.Status == TicketCancellationStatus.Pending, ct))
            throw new ConflictException(
                "CANCELLATION_PENDING",
                "กรุณาพิจารณาคำขอยกเลิกก่อนปฏิเสธ Ticket");
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstOrDefaultAsync(e => e.Id == actorId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");
        var now = DateTime.UtcNow.AddHours(7);
        var oldStatus = ticket.Status;
        var currentAssignment = ticket.Assignments.FirstOrDefault();
        if (currentAssignment is not null)
        {
            currentAssignment.IsActive = false;
            currentAssignment.ActiveSlot = null;
            currentAssignment.EndedAt = now;
            currentAssignment.EndedByEmployeeId = actorId;
            currentAssignment.UpdatedBy = actorId;
        }

        ticket.Status = TicketStatus.Rejected;
        ticket.RejectedByEmployeeId = actorId;
        ticket.RejectedAt = now;
        ticket.RejectionReason = request.Reason.Trim();
        ticket.UpdatedBy = actorId;
        TicketStatusTransition.Record(
            db, ticket, oldStatus, TicketStatus.Rejected, actorId, now,
            ticket.RejectionReason, currentAssignment?.Id);
        var occurrenceId = Guid.NewGuid();
        TicketCommandSupport.QueueNotification(
            db, "TicketRejected", occurrenceId, TicketCommandSupport.Requester(ticket),
            $"ใบแจ้งเรื่อง {ticket.TicketNo} ถูกปฏิเสธ\nเหตุผล: {ticket.RejectionReason}",
            ticket);
        if (currentAssignment is not null)
        {
            TicketCommandSupport.QueueNotification(
                db, "TicketRejected", occurrenceId, currentAssignment.AssignedToEmployeeId,
                currentAssignment.AssignedToEmployee.LineUserId,
                $"งาน {ticket.TicketNo} ถูกยุติ\nเหตุผล: {ticket.RejectionReason}",
                ticket);
        }
        await db.SaveChangesAsync(ct);

        var actorName = TicketCommandSupport.FullName(actor);
        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "reject",
            $"{actorName} ปฏิเสธใบแจ้งเรื่อง {ticket.TicketNo}: {ticket.RejectionReason}",
            new { Status = oldStatus, AssignedToEmployeeId = currentAssignment?.AssignedToEmployeeId },
            new { ticket.Status, ticket.RejectedByEmployeeId, ticket.RejectedAt, ticket.RejectionReason },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
