using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

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
    IAuditLogService auditLog,
    IOptions<TicketOptions> ticketOptions)
    : IRequestHandler<AssignTicketCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(AssignTicketCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            // โหลดเฉพาะแถวผู้รับผิดชอบหลักที่ยัง active — แถวผู้ร่วมงานต้องไม่ถูกแตะตอนเปลี่ยนตัว
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
                .ThenInclude(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissionService, "ticket:assign", ticket, ct);
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException("TICKET_NOT_ASSIGNABLE", "The current ticket status does not allow assignment.");

        var currentAssignment = ticket.Assignments
            .Where(a => a.IsActive && a.IsPrimary)
            .OrderByDescending(a => a.AssignedAt)
            .FirstOrDefault();
        if (currentAssignment?.AssignedToEmployeeId == request.AssignedToEmployeeId)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var reassigningStartedWork = ticket.Status is TicketStatus.InProgress or TicketStatus.WaitingInfo;
        if (reassigningStartedWork && string.IsNullOrWhiteSpace(request.Note))
            throw new BadRequestException("TICKET_REASSIGN_REASON_REQUIRED", "A reason is required when changing the assignee after work has started.");
        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstOrDefaultAsync(e => e.Id == actorId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");
        // Supervisor (หรือ Admin) ของบริษัทปลายทางจ่ายงานข้ามแผนกได้ภายใน company เดียวกัน
        // — งานยังเป็นของแผนกปลายทาง (inbox/scope ไม่เปลี่ยน) แค่ผู้รับผิดชอบมาจากแผนกอื่นได้
        var canAssignAcrossDepartment =
            currentUser.HasRole(RoleType.Admin) ||
            currentUser.HasRole(RoleType.Supervisor, ticket.TargetCompanyId);
        // External ticket ไม่ผูกแผนก — มอบหมายให้พนักงาน active คนไหนก็ได้ในบริษัทที่ fix ไว้
        var allowAnyDepartment = canAssignAcrossDepartment ||
            ticket.RequestType == TicketRequestType.External;
        var assignee = await db.Employees.FirstOrDefaultAsync(e =>
            e.Id == request.AssignedToEmployeeId &&
            e.IsActive &&
            e.CompanyId == ticket.TargetCompanyId &&
            (allowAnyDepartment || e.DepartmentId == ticket.TargetDepartmentId), ct)
            ?? throw new BadRequestException("TICKET_ASSIGNEE_INVALID", "The assignee must be an active employee of the target company.");

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
            MemberRole = TicketAssignmentRole.Owner,
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
        // งานภายในไม่ใช้สถานที่ — ใส่เฉพาะ ticket จาก external portal ที่มีข้อมูลสถานที่จริง
        // งานภายในไม่แสดงสถานที่ — ส่งค่าว่างแล้วบรรทัด "สถานที่:" ในเทมเพลตจะหายไปเอง
        var location = ticket.RequestType == TicketRequestType.External
            ? ticket.LocationText ?? "-"
            : string.Empty;
        TicketCommandSupport.QueueNotification(
            db, eventType, newAssignment.Id, assignee.Id, assignee.LineUserId,
            "ticket.assigned.toAssignee",
            new { ticketNo = ticket.TicketNo, title = ticket.Title, location, assignedBy = actorName },
            ticket);
        TicketCommandSupport.QueueNotification(
            db, eventType, newAssignment.Id, TicketCommandSupport.Requester(ticket),
            "ticket.assigned.toRequester",
            new { ticketNo = ticket.TicketNo, owner = assigneeName },
            ticket);
        if (currentAssignment is not null)
        {
            TicketCommandSupport.QueueNotification(
                db, eventType, newAssignment.Id, oldAssigneeId, oldAssigneeLineUserId,
                "ticket.assigned.toPreviousAssignee",
                new { ticketNo = ticket.TicketNo, owner = assigneeName },
                ticket);
            // ผู้ร่วมงานยังอยู่ในทีมต่อ ต้องรู้ว่าเจ้าภาพเปลี่ยน — คนที่แจ้งไปแล้วข้างบนถูก dedup key กันซ้ำอยู่
            await TicketCommandSupport.QueueForTeamAsync(
                db, ticketOptions.Value, eventType, newAssignment.Id, ticket,
                "ticket.assigned.toTeam",
                new { ticketNo = ticket.TicketNo, owner = assigneeName }, ct,
                excludeEmployeeId: actorId);
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("TICKET_CHANGED", "The ticket was assigned by another user. Reload and try again.");
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
