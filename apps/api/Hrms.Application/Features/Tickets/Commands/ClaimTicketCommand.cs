using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record ClaimTicketCommand(Guid TicketId, DateTime? ExpectedUpdatedAt)
    : IRequest<TicketActionResultDto>;

public class ClaimTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ClaimTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(ClaimTicketCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:update-status", ct);
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-assigned", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");

        if (ticket.Status != TicketStatus.Open || ticket.Assignments.Count != 0)
            throw new ConflictException("TICKET_ALREADY_CLAIMED", "ใบแจ้งเรื่องนี้มีผู้รับผิดชอบแล้ว");

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var responsibility = await db.EmployeeResponsibilities
            .Where(r => r.EmployeeId == employeeId && r.CompanyId == ticket.TargetCompanyId &&
                r.DepartmentId == ticket.TargetDepartmentId && r.CategoryId == ticket.CategoryId &&
                (r.TopicId == null || r.TopicId == ticket.TopicId) && r.IsActive &&
                (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= today) &&
                (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= today) &&
                r.Employee.IsActive && r.Employee.CompanyId == ticket.TargetCompanyId &&
                r.Employee.DepartmentId == ticket.TargetDepartmentId)
            .OrderByDescending(r => r.TopicId.HasValue)
            .FirstOrDefaultAsync(ct)
            ?? throw new AppForbiddenException("คุณไม่ได้อยู่ใน routing ของหมวดหรือหัวข้อนี้");

        var employee = await db.Employees.FirstAsync(e => e.Id == employeeId, ct);
        var now = DateTime.UtcNow.AddHours(7);
        var routingLevel = responsibility.TopicId.HasValue
            ? TicketRoutingLevel.Topic
            : TicketRoutingLevel.Category;
        var assignment = new TicketAssignment
        {
            TicketId = ticket.Id,
            AssignedToEmployeeId = employeeId,
            AssignedByEmployeeId = employeeId,
            AssignedAt = now,
            IsPrimary = true,
            IsActive = true,
            ActiveSlot = "Primary",
            Note = "Employee accepted from routing queue",
            AssignmentSource = TicketAssignmentSource.SelfClaim,
            ResponsibilityId = responsibility.Id,
            RoutingLevelSnapshot = routingLevel,
            CreatedBy = employeeId,
            UpdatedBy = employeeId
        };
        db.TicketAssignments.Add(assignment);

        ticket.SupervisorAcceptedByEmployeeId ??= employeeId;
        ticket.SupervisorAcceptedAt ??= now;
        ticket.ReceiverEmployeeId ??= employeeId;
        ticket.Status = TicketStatus.Assigned;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "assigned");
        ticket.UpdatedBy = employeeId;
        TicketStatusTransition.Record(
            db, ticket, TicketStatus.Open, TicketStatus.Assigned, employeeId, now,
            "SelfClaim", assignment.Id);
        var employeeName = TicketCommandSupport.FullName(employee);
        TicketCommandSupport.QueueNotification(
            db, "TicketClaimed", assignment.Id, TicketCommandSupport.Requester(ticket),
            $"ใบแจ้งเรื่อง {ticket.TicketNo} มีผู้รับผิดชอบแล้ว\nผู้รับผิดชอบ: {employeeName}",
            ticket);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException(
                "TICKET_ALREADY_CLAIMED", "ใบแจ้งเรื่องนี้มีผู้รับผิดชอบแล้ว กรุณาโหลดรายการใหม่");
        }

        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "self-claim",
            $"{employeeName} รับงาน {ticket.TicketNo} จาก routing queue",
            null, new
            {
                AssignmentId = assignment.Id,
                ResponsibilityId = responsibility.Id,
                RoutingLevel = routingLevel
            }, ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
