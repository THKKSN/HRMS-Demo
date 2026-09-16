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

/// <summary>ดึงผู้ร่วมงานเข้าทีมของใบแจ้งเรื่อง (ทีละหลายคนได้)</summary>
public record AddTicketTeamMembersCommand(
    Guid TicketId,
    IReadOnlyList<Guid> EmployeeIds,
    string? Note,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

/// <summary>ถอนผู้ร่วมงานออกจากทีม — soft delete (IsActive = false) ประวัติยังอยู่</summary>
public record RemoveTicketTeamMemberCommand(
    Guid TicketId,
    Guid EmployeeId,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class AddTicketTeamMembersValidator : AbstractValidator<AddTicketTeamMembersCommand>
{
    public AddTicketTeamMembersValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.EmployeeIds).NotEmpty().WithErrorCode("TICKET_TEAM_MEMBER_REQUIRED").WithMessage("At least one team member must be selected.");
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

/// <summary>
/// กติกาที่ตารางบังคับไม่ได้ รวมไว้ที่นี่ที่เดียว: ผู้ร่วมงานต้องอยู่บริษัทปลายทาง ไม่ใช่ผู้แจ้ง
/// ไม่ใช่ผู้รับผิดชอบหลักอยู่แล้ว และห้ามเกินเพดาน <c>Ticket:MaxTeamMembers</c>
/// แถวผู้ร่วมงานต้องเป็น IsPrimary = false, ActiveSlot = null เพราะ unique index (TicketId, ActiveSlot)
/// สงวน slot "Primary" ให้ผู้รับผิดชอบหลักคนเดียว
/// </summary>
public class AddTicketTeamMembersHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog,
    IOptions<TicketOptions> ticketOptions)
    : IRequestHandler<AddTicketTeamMembersCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(AddTicketTeamMembersCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketTeamAccess.EnsureCanManageAsync(db, currentUser, permissions, ticket, ct);
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstOrDefaultAsync(e => e.Id == actorId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var existing = await db.TicketAssignments
            .Include(a => a.AssignedToEmployee)
            .Where(a => a.TicketId == ticket.Id)
            .ToListAsync(ct);
        var owner = existing.FirstOrDefault(a => a.IsActive && a.IsPrimary)
            ?? throw new ConflictException(
                "TICKET_HAS_NO_OWNER", "A ticket needs a primary assignee before a team can be set.");

        var requestedIds = request.EmployeeIds.Distinct().ToList();
        if (requestedIds.Contains(owner.AssignedToEmployeeId))
            throw new BadRequestException("TICKET_TEAM_OWNER_ALREADY_MEMBER", "The primary assignee is already part of the team.");
        // ผู้แจ้งเรื่องเข้าร่วมทีมผู้ดำเนินงานไม่ได้ ยกเว้นเป็นหัวหน้าแผนกปลายทางที่เปิดเรื่องของแผนกตัวเอง
        if (ticket.RequesterEmployeeId.HasValue && requestedIds.Contains(ticket.RequesterEmployeeId.Value) &&
            !await db.Departments.AnyAsync(department =>
                department.Id == ticket.TargetDepartmentId &&
                department.CompanyId == ticket.TargetCompanyId &&
                department.ManagerEmployeeId == ticket.RequesterEmployeeId.Value, ct))
            throw new BadRequestException("TICKET_TEAM_REQUESTER_NOT_ALLOWED", "The requester cannot join the working team.");

        var alreadyActive = existing
            .Where(a => a.IsActive && !a.IsPrimary)
            .Select(a => a.AssignedToEmployeeId)
            .ToHashSet();
        var toAdd = requestedIds.Where(id => !alreadyActive.Contains(id)).ToList();
        if (toAdd.Count == 0)
            return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);

        var maxMembers = Math.Max(1, ticketOptions.Value.MaxTeamMembers);
        if (alreadyActive.Count + toAdd.Count > maxMembers)
            throw new ConflictException(
                "TEAM_LIMIT_REACHED",
                $"A ticket team can have at most {maxMembers} members, excluding the primary assignee.");

        // ผู้ร่วมงานต้องอยู่บริษัทปลายทาง — ข้ามแผนกได้เหมือนการจ่ายงานของ Supervisor
        var employees = await db.Employees
            .Where(e => toAdd.Contains(e.Id) && e.IsActive && e.CompanyId == ticket.TargetCompanyId)
            .ToListAsync(ct);
        if (employees.Count != toAdd.Count)
            throw new BadRequestException(
                "TICKET_TEAM_MEMBER_INVALID", "Team members must be active employees of the target company.");

        var now = DateTime.UtcNow.AddHours(7);
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var occurrenceId = Guid.NewGuid();
        var actorName = TicketCommandSupport.FullName(actor);
        var ownerName = TicketCommandSupport.FullName(owner.AssignedToEmployee);
        foreach (var employee in employees)
        {
            // แถวเดิมที่เคยถูกถอดออก เปิดใช้ใหม่แทนการเพิ่มแถวซ้ำ ประวัติจะไม่รกและไม่ชน index
            var revived = existing.FirstOrDefault(a =>
                !a.IsActive && !a.IsPrimary && a.AssignedToEmployeeId == employee.Id);
            if (revived is not null)
            {
                revived.IsActive = true;
                revived.ActiveSlot = null;
                revived.EndedAt = null;
                revived.EndedByEmployeeId = null;
                revived.AssignedByEmployeeId = actorId;
                revived.AssignedAt = now;
                revived.Note = note;
                revived.UpdatedBy = actorId;
            }
            else
            {
                db.TicketAssignments.Add(new TicketAssignment
                {
                    TicketId = ticket.Id,
                    AssignedToEmployeeId = employee.Id,
                    AssignedByEmployeeId = actorId,
                    AssignedAt = now,
                    MemberRole = TicketAssignmentRole.Member,
                    IsPrimary = false,
                    IsActive = true,
                    ActiveSlot = null,
                    Note = note,
                    AssignmentSource = TicketAssignmentSource.Manual,
                    RoutingLevelSnapshot = TicketRoutingLevel.None,
                    CreatedBy = actorId,
                    UpdatedBy = actorId
                });
            }

            TicketCommandSupport.QueueNotification(
                db, "TicketTeamMemberAdded", occurrenceId, employee.Id, employee.LineUserId,
                "ticket.teamMemberAdded.toMember",
                new { ticketNo = ticket.TicketNo, title = ticket.Title, owner = ownerName, actor = actorName },
                ticket);
        }

        var addedNames = string.Join(", ", employees.Select(TicketCommandSupport.FullName));
        // แจ้งคนที่อยู่ในทีมเดิมให้รู้ว่ามีคนเข้าร่วม (ยกเว้นตัวผู้กระทำ)
        await TicketCommandSupport.QueueForTeamAsync(
            db, ticketOptions.Value, "TicketTeamMemberAdded", occurrenceId, ticket,
            "ticket.teamMemberAdded.toTeam",
            new { ticketNo = ticket.TicketNo, members = addedNames }, ct, excludeEmployeeId: actorId);

        ticket.UpdatedBy = actorId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "add-team-members",
            $"{actorName} ดึง {addedNames} เข้าทีมงาน {ticket.TicketNo}",
            null,
            new { EmployeeIds = employees.Select(e => e.Id), Note = note },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}

public class RemoveTicketTeamMemberHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<RemoveTicketTeamMemberCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(RemoveTicketTeamMemberCommand request, CancellationToken ct)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketTeamAccess.EnsureCanManageAsync(db, currentUser, permissions, ticket, ct);
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var actorId = currentUser.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var member = await db.TicketAssignments
            .Include(a => a.AssignedToEmployee)
            .FirstOrDefaultAsync(a =>
                a.TicketId == ticket.Id && a.AssignedToEmployeeId == request.EmployeeId &&
                a.IsActive && !a.IsPrimary, ct)
            ?? throw new NotFoundException("TicketTeamMember", request.EmployeeId, "TICKET_TEAM_MEMBER_NOT_FOUND");

        var now = DateTime.UtcNow.AddHours(7);
        member.IsActive = false;
        member.ActiveSlot = null;
        member.EndedAt = now;
        member.EndedByEmployeeId = actorId;
        member.UpdatedBy = actorId;

        var memberName = TicketCommandSupport.FullName(member.AssignedToEmployee);
        TicketCommandSupport.QueueNotification(
            db, "TicketTeamMemberRemoved", member.Id, member.AssignedToEmployeeId,
            member.AssignedToEmployee.LineUserId,
            "ticket.teamMemberRemoved.toMember",
            new { ticketNo = ticket.TicketNo, title = ticket.Title }, ticket);

        ticket.UpdatedBy = actorId;
        await db.SaveChangesAsync(ct);

        var actor = await db.Employees.FirstAsync(e => e.Id == actorId, ct);
        await auditLog.LogAsync(
            "ticket", "Ticket", ticket.Id.ToString(), "remove-team-member",
            $"{TicketCommandSupport.FullName(actor)} ถอน {memberName} ออกจากทีมงาน {ticket.TicketNo}",
            new { member.AssignedToEmployeeId, IsActive = true },
            new { member.AssignedToEmployeeId, IsActive = false },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}

/// <summary>สิทธิ์จัดทีม — permission `ticket:manage-team` + ต้องเป็นผู้รับผิดชอบหลัก/หัวหน้าแผนกปลายทาง/Admin</summary>
internal static class TicketTeamAccess
{
    public static async Task EnsureCanManageAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        Ticket ticket,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, TicketTeam.ManageTeamPermission, ct);
        if (ticket.Status is TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled
            or TicketStatus.Resolved or TicketStatus.AwaitingRequesterConfirmation)
            throw new ConflictException("TICKET_TEAM_NOT_EDITABLE", "The current ticket status does not allow editing the team.");
        if (currentUser.HasRole(RoleType.Admin)) return;

        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        // เช็คความเป็นเจ้าภาพ/หัวหน้าแผนกก่อน — หัวหน้าแผนกที่เปิดเรื่องเข้าแผนกตัวเองต้องจัดทีมของตัวเองได้
        if (await TicketTeam.IsActiveOwnerAsync(db, employeeId, ticket.Id, ct)) return;
        if (await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct)) return;
        if (employeeId == ticket.RequesterEmployeeId)
            throw new AppForbiddenException("TICKET_REQUESTER_CANNOT_MANAGE_TEAM", "The requester cannot manage the working team.");
        throw new AppForbiddenException("TICKET_TEAM_MANAGER_ONLY", "Only the primary assignee or the target department manager can manage the team.");
    }
}
