using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Domain.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record RequestTicketCancellationCommand(
    Guid TicketId,
    string Reason,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketCancellationRequestDto>;

public class RequestTicketCancellationValidator : AbstractValidator<RequestTicketCancellationCommand>
{
    public RequestTicketCancellationValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MinimumLength(10).MaximumLength(1000);
    }
}

public class RequestTicketCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<RequestTicketCancellationCommand, TicketCancellationRequestDto>
{
    public async Task<TicketCancellationRequestDto> Handle(
        RequestTicketCancellationCommand request,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-own", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var ticket = await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.TargetCompany)
            .Include(t => t.TargetDepartment).ThenInclude(d => d!.ManagerEmployee)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
                .ThenInclude(a => a.AssignedToEmployee)
            .Include(t => t.CancellationRequests)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");

        if (ticket.RequesterEmployeeId != employeeId)
            throw new AppForbiddenException("TICKET_CANCELLATION_OWNER_ONLY", "Only the requester can ask to cancel this ticket.");
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned or
            TicketStatus.InProgress or TicketStatus.WaitingInfo))
            throw new ConflictException(
                "CANNOT_REQUEST_CANCELLATION",
                "The current status does not allow a cancellation request.");
        if (ticket.CancellationRequests.Any(c =>
            c.Status == TicketCancellationStatus.Pending))
            throw new ConflictException(
                "CANCELLATION_ALREADY_PENDING",
                "This ticket already has a cancellation request awaiting review.");

        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);
        var now = DateTime.UtcNow.AddHours(7);
        var cancellation = new TicketCancellationRequest
        {
            TicketId = ticket.Id,
            RequestedByEmployeeId = employeeId,
            Reason = request.Reason.Trim(),
            Status = TicketCancellationStatus.Pending,
            PendingSlot = "Pending",
            RequestedAt = now,
            CreatedBy = employeeId,
            UpdatedBy = employeeId
        };

        db.TicketCancellationRequests.Add(cancellation);
        ticket.UpdatedBy = employeeId;
        var requester = TicketCommandSupport.Requester(ticket);
        const string templateKey = "ticket.cancellationRequested.toReviewers";
        var templateParams = new
        {
            ticketNo = ticket.TicketNo,
            requester = requester.DisplayName,
            reason = cancellation.Reason,
        };
        var recipients = new HashSet<string>(StringComparer.Ordinal);
        var manager = ticket.TargetDepartment?.ManagerEmployee;
        if (!string.IsNullOrWhiteSpace(manager?.LineUserId) && recipients.Add(manager.LineUserId))
            TicketCommandSupport.QueueNotification(
                db, "TicketCancellationRequested", cancellation.Id, manager.Id,
                manager.LineUserId, templateKey, templateParams, ticket);

        var assignee = ticket.Assignments.FirstOrDefault()?.AssignedToEmployee;
        if (!string.IsNullOrWhiteSpace(assignee?.LineUserId) && recipients.Add(assignee.LineUserId))
            TicketCommandSupport.QueueNotification(
                db, "TicketCancellationRequested", cancellation.Id, assignee.Id,
                assignee.LineUserId, templateKey, templateParams, ticket);

        var supervisors = await db.EmployeeRoles.AsNoTracking()
            .Where(role =>
                role.RoleId == SystemRoleIds.Supervisor &&
                role.IsActive &&
                (!role.ValidFrom.HasValue || role.ValidFrom.Value <= now) &&
                (!role.ValidTo.HasValue || role.ValidTo.Value >= now) &&
                role.Employee.IsActive &&
                role.Employee.CompanyId == ticket.TargetCompanyId &&
                role.Employee.DepartmentId == ticket.TargetDepartmentId &&
                (!role.CompanyId.HasValue || role.CompanyId == ticket.TargetCompanyId) &&
                (!role.DepartmentId.HasValue || role.DepartmentId == ticket.TargetDepartmentId) &&
                role.Employee.LineUserId != null)
            .Select(role => new { role.EmployeeId, role.Employee.LineUserId })
            .Distinct()
            .ToListAsync(ct);
        foreach (var supervisor in supervisors)
        {
            if (!recipients.Add(supervisor.LineUserId!)) continue;
            TicketCommandSupport.QueueNotification(
                db, "TicketCancellationRequested", cancellation.Id, supervisor.EmployeeId,
                supervisor.LineUserId, templateKey, templateParams, ticket);
        }
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ConflictException(
                "CANCELLATION_ALREADY_PENDING",
                "This ticket already has a cancellation request awaiting review.");
        }
        await auditLog.LogAsync(
            "ticket",
            "Ticket",
            ticket.Id.ToString(),
            "request-cancellation",
            $"{requester.DisplayName} ขอยกเลิก {ticket.TicketNo}",
            new { ticket.Status },
            new { CancellationRequestId = cancellation.Id, cancellation.Reason },
            ct);

        return TicketCancellationMapping.ToDto(cancellation, ticket);
    }
}

public record ApproveTicketCancellationCommand(
    Guid TicketId,
    string? ReviewNote,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public record RejectTicketCancellationCommand(
    Guid TicketId,
    string ReviewNote,
    DateTime? ExpectedUpdatedAt) : IRequest<TicketActionResultDto>;

public class ApproveTicketCancellationValidator : AbstractValidator<ApproveTicketCancellationCommand>
{
    public ApproveTicketCancellationValidator() =>
        RuleFor(x => x.ReviewNote).MaximumLength(1000);
}

public class RejectTicketCancellationValidator : AbstractValidator<RejectTicketCancellationCommand>
{
    public RejectTicketCancellationValidator() =>
        RuleFor(x => x.ReviewNote).NotEmpty().MaximumLength(1000);
}

public class ApproveTicketCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<ApproveTicketCancellationCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(
        ApproveTicketCancellationCommand request,
        CancellationToken ct)
    {
        var ticket = await TicketCancellationSupport.LoadForReviewAsync(db, request.TicketId, ct);
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissions, "ticket:update-status", ticket, ct);
        TicketCancellationSupport.EnsureReviewable(ticket);
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var cancellation = ticket.CancellationRequests.Single();
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId && e.IsActive, ct);
        var now = DateTime.UtcNow.AddHours(7);
        var oldStatus = ticket.Status;
        var reviewNote = string.IsNullOrWhiteSpace(request.ReviewNote)
            ? null
            : request.ReviewNote.Trim();

        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            foreach (var assignment in ticket.Assignments)
            {
                assignment.IsActive = false;
                assignment.ActiveSlot = null;
                assignment.EndedAt = now;
                assignment.EndedByEmployeeId = actorId;
                assignment.UpdatedBy = actorId;
            }

            cancellation.Status = TicketCancellationStatus.Approved;
            cancellation.PendingSlot = null;
            cancellation.ReviewedByEmployeeId = actorId;
            cancellation.ReviewedAt = now;
            cancellation.ReviewNote = reviewNote;
            cancellation.UpdatedBy = actorId;
            ticket.Status = TicketStatus.Cancelled;
            ticket.CancelledByEmployeeId = actorId;
            ticket.CancelledAt = now;
            ticket.CancellationReason = cancellation.Reason;
            ticket.UpdatedBy = actorId;
            TicketStatusTransition.Record(
                db, ticket, oldStatus, TicketStatus.Cancelled, actorId, now,
                cancellation.Reason, ticket.Assignments.FirstOrDefault()?.Id);
            TicketCancellationSupport.QueueRequesterAndAssignees(
                db, ticket, "TicketCancelled", cancellation.Id,
                "ticket.cancelled.all",
                new { ticketNo = ticket.TicketNo, reason = cancellation.Reason });
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync(
                "ticket",
                "Ticket",
                ticket.Id.ToString(),
                "approve-cancellation",
                $"{TicketCommandSupport.FullName(actor)} อนุมัติยกเลิก {ticket.TicketNo}",
                new { Status = oldStatus, CancellationStatus = TicketCancellationStatus.Pending },
                new { ticket.Status, CancellationStatus = cancellation.Status, reviewNote },
                transactionCt);
        }, ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}

public class RejectTicketCancellationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    IAuditLogService auditLog)
    : IRequestHandler<RejectTicketCancellationCommand, TicketActionResultDto>
{
    public async Task<TicketActionResultDto> Handle(
        RejectTicketCancellationCommand request,
        CancellationToken ct)
    {
        var ticket = await TicketCancellationSupport.LoadForReviewAsync(db, request.TicketId, ct);
        await TicketSupervisorAccess.EnsureTicketAsync(
            db, currentUser, permissions, "ticket:update-status", ticket, ct);
        TicketCancellationSupport.EnsureReviewable(ticket);
        TicketCommandSupport.EnsureExpectedVersion(ticket, request.ExpectedUpdatedAt);

        var cancellation = ticket.CancellationRequests.Single();
        var actorId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var actor = await db.Employees.FirstAsync(e => e.Id == actorId && e.IsActive, ct);
        var now = DateTime.UtcNow.AddHours(7);
        cancellation.Status = TicketCancellationStatus.Rejected;
        cancellation.PendingSlot = null;
        cancellation.ReviewedByEmployeeId = actorId;
        cancellation.ReviewedAt = now;
        cancellation.ReviewNote = request.ReviewNote.Trim();
        cancellation.UpdatedBy = actorId;
        ticket.UpdatedBy = actorId;
        TicketCancellationSupport.QueueRequesterAndAssignees(
            db, ticket, "TicketCancellationRejected", cancellation.Id,
            "ticket.cancellationRejected.all",
            new { ticketNo = ticket.TicketNo, reason = cancellation.ReviewNote });
        await db.SaveChangesAsync(ct);
        await auditLog.LogAsync(
            "ticket",
            "Ticket",
            ticket.Id.ToString(),
            "reject-cancellation",
            $"{TicketCommandSupport.FullName(actor)} ปฏิเสธคำขอยกเลิก {ticket.TicketNo}",
            new { CancellationStatus = TicketCancellationStatus.Pending },
            new { CancellationStatus = cancellation.Status, cancellation.ReviewNote },
            ct);

        return new TicketActionResultDto(ticket.Id, ticket.Status, ticket.UpdatedAt);
    }
}

internal static class TicketCancellationSupport
{
    public static async Task<Ticket> LoadForReviewAsync(
        IApplicationDbContext db,
        Guid ticketId,
        CancellationToken ct)
        => await db.Tickets
            .Include(t => t.RequesterEmployee)
            .Include(t => t.ExternalReporter)
            .Include(t => t.Assignments.Where(a => a.IsActive && a.IsPrimary))
                .ThenInclude(a => a.AssignedToEmployee)
            .Include(t => t.CancellationRequests.Where(c =>
                c.Status == TicketCancellationStatus.Pending))
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct)
            ?? throw new NotFoundException("Ticket", ticketId, "TICKET_NOT_FOUND");

    public static void EnsureReviewable(Ticket ticket)
    {
        if (ticket.CancellationRequests.Count != 1)
            throw new ConflictException(
                "CANCELLATION_NOT_PENDING",
                "No cancellation request is awaiting review.");
        if (ticket.Status is not (TicketStatus.Open or TicketStatus.Assigned or
            TicketStatus.InProgress or TicketStatus.WaitingInfo or TicketStatus.Resolved))
            throw new ConflictException(
                "CANNOT_REVIEW_CANCELLATION",
                "The ticket status changed, so this cancellation request can no longer be reviewed.");
    }

    public static void QueueRequesterAndAssignees(
        IApplicationDbContext db,
        Ticket ticket,
        string eventType,
        Guid occurrenceId,
        string templateKey,
        object? parameters)
    {
        var recipients = new HashSet<string>(StringComparer.Ordinal);
        var requester = TicketCommandSupport.Requester(ticket);
        if (!string.IsNullOrWhiteSpace(requester.LineUserId) &&
            recipients.Add(requester.LineUserId))
        {
            TicketCommandSupport.QueueNotification(
                db, eventType, occurrenceId, requester, templateKey, parameters, ticket);
        }

        foreach (var assignment in ticket.Assignments)
        {
            var lineUserId = assignment.AssignedToEmployee.LineUserId;
            if (string.IsNullOrWhiteSpace(lineUserId) || !recipients.Add(lineUserId)) continue;
            TicketCommandSupport.QueueNotification(
                db, eventType, occurrenceId, assignment.AssignedToEmployeeId,
                lineUserId, templateKey, parameters, ticket);
        }
    }
}

internal static class TicketCancellationMapping
{
    public static TicketCancellationRequestDto ToDto(
        TicketCancellationRequest cancellation,
        Ticket ticket)
        => new(
            cancellation.Id,
            ticket.Id,
            ticket.TicketNo,
            ticket.Title,
            cancellation.RequestedByEmployeeId,
            cancellation.RequestedByExternalReporterId,
            ticket.RequesterEmployee is null
                ? ticket.RequesterNameSnapshot ?? "External requester"
                : TicketCommandSupport.FullName(ticket.RequesterEmployee),
            cancellation.Reason,
            cancellation.Status,
            cancellation.RequestedAt,
            cancellation.ReviewedByEmployeeId,
            cancellation.ReviewedByEmployee is null
                ? null
                : TicketCommandSupport.FullName(cancellation.ReviewedByEmployee),
            cancellation.ReviewedAt,
            cancellation.ReviewNote,
            ticket.TargetCompanyId,
            ticket.TargetCompany.Name,
            ticket.TargetDepartmentId,
            ticket.TargetDepartment?.Name,
            ticket.Status,
            ticket.UpdatedAt);
}
