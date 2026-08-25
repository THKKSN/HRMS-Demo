using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

internal static class TicketAccess
{
    public static async Task EnsureCanViewAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        Ticket ticket,
        CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (currentUser.HasRole(RoleType.Admin)) return;

        if (ticket.RequesterEmployeeId == employeeId &&
            await permissions.HasPermissionAsync(currentUser, "ticket:view-own", ct)) return;

        var hasAssignment = await db.TicketAssignments.AnyAsync(a =>
            a.TicketId == ticket.Id && a.AssignedToEmployeeId == employeeId && a.IsPrimary, ct);
        if (hasAssignment && await permissions.HasPermissionAsync(currentUser, "ticket:view-assigned", ct)) return;

        if (await IsRoutingCandidateAsync(db, employeeId, ticket, ct) &&
            await permissions.HasPermissionAsync(currentUser, "ticket:view-assigned", ct)) return;

        if (await IsDepartmentManagerAsync(db, currentUser, ticket, ct) &&
            await permissions.HasPermissionAsync(currentUser, "ticket:view-team", ct)) return;

        throw new AppForbiddenException("ไม่มีสิทธิ์ดูใบแจ้งเรื่องนี้");
    }

    public static async Task EnsureActiveAssigneeAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        string permission,
        Ticket ticket,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, permission, ct);
        if (currentUser.HasRole(RoleType.Admin)) return;

        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var isAssignee = await IsActiveAssigneeAsync(db, employeeId, ticket.Id, ct);
        if (!isAssignee)
            throw new AppForbiddenException("เฉพาะผู้รับผิดชอบปัจจุบันเท่านั้นที่ดำเนินการได้");
    }

    public static Task<bool> IsActiveAssigneeAsync(
        IApplicationDbContext db, Guid employeeId, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AnyAsync(a =>
            a.TicketId == ticketId && a.AssignedToEmployeeId == employeeId && a.IsActive && a.IsPrimary, ct);

    public static Task<bool> IsRoutingCandidateAsync(
        IApplicationDbContext db, Guid employeeId, Ticket ticket, CancellationToken ct)
    {
        if (ticket.Status != TicketStatus.Open) return Task.FromResult(false);
        return IsRoutingCandidateCoreAsync(db, employeeId, ticket, ct);
    }

    private static async Task<bool> IsRoutingCandidateCoreAsync(
        IApplicationDbContext db, Guid employeeId, Ticket ticket, CancellationToken ct)
    {
        // External ticket ไม่มี internal Category/Topic ให้ match responsibility — ไม่มี auto-routing candidate เลย
        if (ticket.RequestType == TicketRequestType.External) return false;

        if (await db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticket.Id && a.IsActive && a.IsPrimary, ct)) return false;

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        return await db.EmployeeResponsibilities.AsNoTracking().AnyAsync(r =>
            r.EmployeeId == employeeId && r.CompanyId == ticket.TargetCompanyId &&
            r.DepartmentId == ticket.TargetDepartmentId && r.CategoryId == ticket.CategoryId!.Value &&
            (r.TopicId == null || r.TopicId == ticket.TopicId) && r.IsActive &&
            (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= today) &&
            (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= today) &&
            r.Employee.IsActive && r.Employee.CompanyId == ticket.TargetCompanyId &&
            r.Employee.DepartmentId == ticket.TargetDepartmentId, ct);
    }

    public static async Task EnsureWorkerOrManagerAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        string permission,
        Ticket ticket,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, permission, ct);
        if (currentUser.HasRole(RoleType.Admin)) return;
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (await IsActiveAssigneeAsync(db, employeeId, ticket.Id, ct)) return;
        if (await IsDepartmentManagerAsync(db, currentUser, ticket, ct)) return;
        throw new AppForbiddenException("ไม่มีสิทธิ์ดำเนินการกับใบแจ้งเรื่องนี้");
    }

    public static async Task<bool> IsDepartmentManagerAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        Ticket ticket,
        CancellationToken ct)
    {
        if (currentUser.HasRole(RoleType.Admin)) return true;

        if (ticket.RequestType == TicketRequestType.External)
        {
            // External ticket ไม่ผูกแผนก — ถือว่า "manager" ได้ถ้าเป็น Supervisor ของบริษัทที่ fix ไว้
            return currentUser.HasRole(RoleType.Supervisor, ticket.TargetCompanyId) &&
                currentUser.CompanyId == ticket.TargetCompanyId;
        }

        var department = await db.Departments.AsNoTracking()
            .Where(d => d.Id == ticket.TargetDepartmentId && d.CompanyId == ticket.TargetCompanyId && d.IsActive)
            .Select(d => new { d.ManagerEmployeeId })
            .FirstOrDefaultAsync(ct);
        if (department is null) return false;
        if (currentUser.CanManageDepartment(
            ticket.TargetCompanyId, ticket.TargetDepartmentId!.Value, department.ManagerEmployeeId)) return true;
        return currentUser.HasRole(RoleType.Supervisor, ticket.TargetCompanyId) && currentUser.EmployeeId.HasValue &&
            await db.Employees.AnyAsync(employee =>
                employee.Id == currentUser.EmployeeId.Value && employee.IsActive &&
                employee.CompanyId == ticket.TargetCompanyId &&
                employee.DepartmentId == ticket.TargetDepartmentId, ct);
    }

    public static async Task<TicketActionFlagsDto> GetActionFlagsAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        Ticket ticket,
        CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId;
        var isAdmin = currentUser.HasRole(RoleType.Admin);
        var isRequester = employeeId.HasValue && ticket.RequesterEmployeeId == employeeId.Value;
        var isAssignee = employeeId.HasValue && await db.TicketAssignments.AnyAsync(a =>
            a.TicketId == ticket.Id && a.AssignedToEmployeeId == employeeId.Value && a.IsActive && a.IsPrimary, ct);
        var isManager = await IsDepartmentManagerAsync(db, currentUser, ticket, ct);
        var isRoutingCandidate = employeeId.HasValue &&
            await IsRoutingCandidateAsync(db, employeeId.Value, ticket, ct);
        var canWork = !isRequester && (isAdmin || isAssignee);
        var canUpdateStatus = await permissions.HasPermissionAsync(currentUser, "ticket:update-status", ct);
        var canTriagePermission = await permissions.HasPermissionAsync(currentUser, "ticket:triage", ct);
        var canAssignPermission = await permissions.HasPermissionAsync(currentUser, "ticket:assign", ct);
        var canResolvePermission = await permissions.HasPermissionAsync(currentUser, "ticket:resolve", ct);
        var canCommentPermission = await permissions.HasPermissionAsync(currentUser, "ticket:comment", ct);
        var canAddInternalNotePermission = await permissions.HasPermissionAsync(
            currentUser, "ticket:add-internal-note", ct);
        var canAttachmentPermission = await permissions.HasPermissionAsync(currentUser, "ticket:add-attachment", ct);
        var canReturnPermission = await permissions.HasPermissionAsync(currentUser, "ticket:return", ct);
        var canClosePermission = await permissions.HasPermissionAsync(currentUser, "ticket:close", ct);
        var canViewReportPermission = await permissions.HasPermissionAsync(currentUser, "ticket:view-report", ct);
        var isReceiverManager = isManager && !isRequester;
        var isReceiverSide = !isRequester && (isReceiverManager || isAssignee || isRoutingCandidate);
        var isTerminal = ticket.Status is TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled;

        var hasPendingCancellation = await db.TicketCancellationRequests.AnyAsync(cancellation =>
            cancellation.TicketId == ticket.Id &&
            cancellation.Status == TicketCancellationStatus.Pending, ct);

        return new TicketActionFlagsDto(
            isRequester,
            isReceiverSide,
            canUpdateStatus && isReceiverManager &&
                ticket.Status == TicketStatus.Open && !ticket.SupervisorAcceptedAt.HasValue,
            canTriagePermission && isReceiverManager &&
                ticket.RequestType == TicketRequestType.Internal &&
                ticket.Status is (TicketStatus.Open or TicketStatus.Assigned),
            canAssignPermission && isReceiverManager &&
                ticket.Status is (TicketStatus.Open or TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo),
            canUpdateStatus && isReceiverManager && !hasPendingCancellation &&
                ticket.Status is (TicketStatus.Open or TicketStatus.Assigned),
            canUpdateStatus && canWork && ticket.Status == TicketStatus.Assigned,
            canUpdateStatus && canWork &&
                ticket.Status is (TicketStatus.Assigned or TicketStatus.InProgress or TicketStatus.WaitingInfo),
            canUpdateStatus && (canWork || isReceiverManager) && ticket.Status == TicketStatus.InProgress,
            canUpdateStatus && canWork && ticket.Status == TicketStatus.WaitingInfo,
            canResolvePermission && canWork && ticket.Status == TicketStatus.InProgress,
            !isTerminal && canCommentPermission && (isRequester || isAssignee || isManager || isAdmin),
            !isTerminal && canAddInternalNotePermission && isReceiverManager,
            canAttachmentPermission && (isRequester || isAssignee || isManager || isAdmin) &&
                !isTerminal,
            canAttachmentPermission && canWork &&
                ticket.Status is not (TicketStatus.Resolved or TicketStatus.Closed or TicketStatus.Rejected or TicketStatus.Cancelled),
            canReturnPermission && isReceiverManager && ticket.Status == TicketStatus.Resolved,
            canClosePermission && isReceiverManager && !hasPendingCancellation &&
                ticket.Status == TicketStatus.Resolved,
            canViewReportPermission && isManager,
            canUpdateStatus && !isRequester && isRoutingCandidate,
            isRequester && !hasPendingCancellation &&
                ticket.Status is (TicketStatus.Open or TicketStatus.Assigned or
                    TicketStatus.InProgress or TicketStatus.WaitingInfo));
    }
}
