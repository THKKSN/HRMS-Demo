using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record AssignTicketCommand(
    Guid TicketId,
    Guid AssignedToEmployeeId,
    string? Note,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class AssignTicketValidator : AbstractValidator<AssignTicketCommand>
{
    public AssignTicketValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.AssignedToEmployeeId).NotEmpty();
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public class AssignTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<AssignTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(AssignTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
                .ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:assign", ticket, ct);
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("INVALID_TICKET_STATUS", "สถานะปัจจุบันไม่อนุญาตให้มอบหมายงาน");

        var currentAssignment = ticket.Assignments
            .OrderByDescending(a => a.AssignedAt)
            .FirstOrDefault();
        if (currentAssignment?.AssignedToEmployeeId == request.AssignedToEmployeeId)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var reassigningStartedWork = ticket.Status is TicketStatus.InProgress or TicketStatus.WaitingInfo;
        if (reassigningStartedWork && string.IsNullOrWhiteSpace(request.Note))
            throw new FluentValidation.ValidationException("กรุณาระบุเหตุผลเมื่อเปลี่ยนผู้รับผิดชอบหลังเริ่มงาน");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstOrDefaultAsync(e => e.Id == actorId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");
        var assignee = await db.Employees.FirstOrDefaultAsync(e =>
            e.Id == request.AssignedToEmployeeId &&
            e.IsActive &&
            e.CompanyId == ticket.TargetCompanyId &&
            e.DepartmentId == ticket.TargetDepartmentId, ct)
            ?? throw new FluentValidation.ValidationException("ผู้รับผิดชอบต้องเป็นพนักงานที่ใช้งานอยู่ในแผนกปลายทาง");

        var now = DateTime.UtcNow.AddHours(7);
        var action = currentAssignment is null ? "assign" : reassigningStartedWork ? "reassign-after-start" : "reassign";
        var oldStatus = ticket.Status;
        var oldAssigneeId = currentAssignment?.AssignedToEmployeeId;
        var oldAssigneeName = currentAssignment is null
            ? null
            : TicketCommandSupport.FullName(currentAssignment.AssignedToEmployee);
        var oldAssigneeLineUserId = currentAssignment?.AssignedToEmployee.LineUserId;

        if (currentAssignment is not null)
        {
            currentAssignment.IsActive = false;
            currentAssignment.ActiveSlot = null;
            currentAssignment.EndedAt = now;
            currentAssignment.EndedByEmployeeId = actorId;
            currentAssignment.UpdatedBy = actorId;
        }

        if (!ticket.SupervisorAcceptedAt.HasValue)
        {
            ticket.SupervisorAcceptedByEmployeeId = actorId;
            ticket.SupervisorAcceptedAt = now;
            ticket.ReceiverEmployeeId = actorId;
        }

        var newAssignment = new TicketAssignment
        {
            TicketId = ticket.Id,
            AssignedToEmployeeId = assignee.Id,
            AssignedByEmployeeId = actorId,
            AssignedAt = now,
            IsPrimary = true,
            IsActive = true,
            ActiveSlot = "Primary",
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            AssignmentSource = TicketAssignmentSource.Manual,
            RoutingLevelSnapshot = TicketRoutingLevel.None,
            CreatedBy = actorId,
            UpdatedBy = actorId
        };
        db.TicketAssignments.Add(newAssignment);
        ticket.Status = TicketStatus.Assigned;
        TicketCommandSupport.SetWorkflowBoardState(ticket, "assigned");
        if (reassigningStartedWork)
        {
            ticket.WorkStartedByEmployeeId = null;
            ticket.WorkStartedAt = null;
            ticket.WaitingInfoByEmployeeId = null;
            ticket.WaitingInfoAt = null;
            TicketCommandSupport.AddProgressEntry(
                db,
                ticket,
                actorId,
                "assigned",
                workState: "เปลี่ยนผู้รับผิดชอบ",
                nextAction: "เริ่มงานกับผู้รับผิดชอบใหม่",
                note: request.Note,
                ownerEmployeeId: assignee.Id);
        }
        ticket.UpdatedBy = actorId;
        if (oldStatus != TicketStatus.Assigned)
        {
            TicketStatusTransition.Record(
                db, ticket, oldStatus, TicketStatus.Assigned, actorId, now,
                reassigningStartedWork ? request.Note : "Assigned", newAssignment.Id);
        }
        var actorName = TicketCommandSupport.FullName(actor);
        var assigneeName = TicketCommandSupport.FullName(assignee);
        var eventType = currentAssignment is null ? "TicketAssigned" : "TicketReassigned";
        TicketCommandSupport.QueueNotification(
            db, eventType, newAssignment.Id, assignee.Id, assignee.LineUserId,
            $"คุณได้รับมอบหมายงาน {ticket.TicketNo}\nเรื่อง: {ticket.Title}\nสถานที่: {ticket.LocationText ?? "-"}\nผู้มอบหมาย: {actorName}",
            ticket);
        TicketCommandSupport.QueueNotification(
            db, eventType, newAssignment.Id, TicketCommandSupport.Requester(ticket),
            $"ใบแจ้งเรื่อง {ticket.TicketNo} ได้รับการมอบหมายแล้ว\nผู้รับผิดชอบ: {assigneeName}",
            ticket);
        if (currentAssignment is not null)
        {
            TicketCommandSupport.QueueNotification(
                db, eventType, newAssignment.Id, oldAssigneeId, oldAssigneeLineUserId,
                $"งาน {ticket.TicketNo} ถูกเปลี่ยนผู้รับผิดชอบแล้ว\nผู้รับผิดชอบใหม่: {assigneeName}",
                ticket);
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("TICKET_CHANGED", "ใบแจ้งเรื่องถูกมอบหมายโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่");
        }

        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), action,
            action == "assign"
                ? $"{actorName} มอบหมาย {ticket.TicketNo} ให้ {assigneeName}"
                : $"{actorName} เปลี่ยนผู้รับผิดชอบ {ticket.TicketNo} จาก {oldAssigneeName} เป็น {assigneeName}",
            new { AssignedToEmployeeId = oldAssigneeId, Status = oldStatus },
            new { AssignedToEmployeeId = assignee.Id, ticket.Status, Note = request.Note },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}
