using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record AcceptTicketCommand(Guid TicketId, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class AcceptTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<AcceptTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(AcceptTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:update-status", ticket, ct);

        if (ticket.SupervisorAcceptedAt.HasValue)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
        if (ticket.Status != TicketStatus.Open)
            throw new ConflictException("INVALID_TICKET_STATUS", "รับเรื่องได้เฉพาะใบแจ้งเรื่องสถานะ Open");

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstOrDefaultAsync(e => e.Id == actorId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");
        var now = DateTime.UtcNow.AddHours(7);

        ticket.SupervisorAcceptedByEmployeeId = actorId;
        ticket.SupervisorAcceptedAt = now;
        ticket.ReceiverEmployeeId = actorId;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "received");
        ticket.UpdatedBy = actorId;
        TicketCommandSupport.QueueNotification(
            db, "TicketAccepted", ticket.Id, ticket.RequesterEmployeeId,
            ticket.RequesterEmployee.LineUserId,
            $"ใบแจ้งเรื่อง {ticket.TicketNo} ได้รับการรับเรื่องแล้ว\nผู้รับเรื่อง: {TicketCommandSupport.FullName(actor)}",
            ticket);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "accept",
            $"{TicketCommandSupport.FullName(actor)} รับเรื่อง {ticket.TicketNo}",
            null,
            new { ticket.SupervisorAcceptedByEmployeeId, ticket.SupervisorAcceptedAt },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
