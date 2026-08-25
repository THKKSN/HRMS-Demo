using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketDetailQuery(Guid TicketId) : IRequest<TicketDetailDto>;

public class GetTicketDetailHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    ITicketRequesterResolver requesterResolver)
    : IRequestHandler<GetTicketDetailQuery, TicketDetailDto>
{
    public async Task<TicketDetailDto> Handle(GetTicketDetailQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .AsNoTracking()
            .Include(t => t.RequesterEmployee)
                .ThenInclude(e => e!.Company)
            .Include(t => t.ExternalReporter)
            .Include(t => t.SourceCompany)
            .Include(t => t.SourceDepartment)
            .Include(t => t.TargetCompany)
            .Include(t => t.TargetDepartment)
            .Include(t => t.Category)
            .Include(t => t.Topic)
            .Include(t => t.Subject)
            .Include(t => t.ExternalTicketCategory)
            .Include(t => t.ExternalTicketTopic)
            .Include(t => t.ExternalTicketSubject)
            .Include(t => t.ReceiverEmployee)
            .Include(t => t.SupervisorAcceptedByEmployee)
            .Include(t => t.WorkStartedByEmployee)
            .Include(t => t.WaitingInfoByEmployee)
            .Include(t => t.ResolvedByEmployee)
            .Include(t => t.VerifiedByEmployee)
            .Include(t => t.ClosedByEmployee)
            .Include(t => t.RejectedByEmployee)
            .Include(t => t.CancelledByEmployee)
            .Include(t => t.Attachments)
            .Include(t => t.Assignments).ThenInclude(a => a.AssignedToEmployee)
            .Include(t => t.Assignments).ThenInclude(a => a.AssignedByEmployee)
            .Include(t => t.Assignments).ThenInclude(a => a.EndedByEmployee)
            .Include(t => t.CancellationRequests).ThenInclude(c => c.RequestedByEmployee)
            .Include(t => t.CancellationRequests).ThenInclude(c => c.ReviewedByEmployee)
            .Include(t => t.ProgressEntries).ThenInclude(p => p.OwnerEmployee)
            .Include(t => t.ProgressEntries).ThenInclude(p => p.CreatedByEmployee)
            .Include(t => t.ProgressEntries).ThenInclude(p => p.Attachments)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new KeyNotFoundException("ไม่พบใบแจ้งเรื่อง");

        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissionService, ticket, ct);
        var actions = await TicketAccess.GetActionFlagsAsync(db, currentUser, permissionService, ticket, ct);
        var canViewManagementAudit = !actions.IsRequester &&
            (currentUser.HasRole(Hrms.Domain.Enums.RoleType.Admin) ||
                await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct));
        var canSeeInternalAttachments = !actions.IsRequester &&
            await permissionService.HasPermissionAsync(currentUser, "ticket:add-internal-note", ct) &&
            (currentUser.HasRole(Hrms.Domain.Enums.RoleType.Admin) ||
                await TicketAccess.IsDepartmentManagerAsync(db, currentUser, ticket, ct));

        var auditEvents = await db.AuditLogs
            .AsNoTracking()
            .Where(a => a.Module == "ticket" && a.EntityId == ticket.Id.ToString())
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new TicketAuditEventDto(
                a.Id,
                a.Action,
                a.Description,
                canViewManagementAudit ? a.OldValues : null,
                canViewManagementAudit ? a.NewValues : null,
                a.PerformedByEmployeeId,
                a.PerformedByName,
                a.CreatedAt))
            .ToListAsync(ct);

        var current = ticket.Assignments
            .Where(a => a.IsPrimary)
            .OrderByDescending(a => a.IsActive)
            .ThenByDescending(a => a.AssignedAt)
            .FirstOrDefault();
        var latestCancellation = ticket.CancellationRequests
            .OrderByDescending(c => c.RequestedAt)
            .FirstOrDefault();
        var requester = requesterResolver.FromTicket(ticket);

        return new TicketDetailDto(
            ticket.Id,
            ticket.TicketNo,
            ticket.RequestType,
            ticket.SourceChannel,
            ticket.Status,
            ticket.Priority,
            ticket.RequesterEmployeeId,
            requester.DisplayName,
            requester.ToDto(includeContact: true),
            ticket.SourceCompanyId,
            ticket.SourceCompany?.Name,
            ticket.SourceDepartmentId,
            ticket.SourceDepartment?.Name,
            ticket.TargetCompanyId,
            ticket.TargetCompany.Name,
            ticket.TargetDepartmentId,
            ticket.TargetDepartment?.Name,
            ticket.CategoryId,
            ticket.Category?.Name,
            ticket.TopicId,
            ticket.Topic?.Name,
            ticket.SubjectId,
            ticket.Subject?.Name,
            ticket.ExternalTicketCategoryId,
            ticket.ExternalTicketCategory?.Name,
            ticket.ExternalTicketTopicId,
            ticket.ExternalTicketTopic?.Name,
            ticket.ExternalTicketSubjectId,
            ticket.ExternalTicketSubject?.Name,
            ticket.OtherTopicText,
            ticket.Title,
            ticket.Detail,
            ticket.WorkflowDefinitionId,
            ticket.WorkflowName,
            ticket.WorkflowAutoAcknowledgeAfterDays,
            TicketWorkflowRuntime.DeserializeBoardSteps(ticket.WorkflowBoardStepsJson),
            TicketWorkflowRuntime.DeserializeInProgressPresets(ticket.WorkflowInProgressPresetsJson),
            TicketWorkflowRuntime.DeserializeActions(ticket.WorkflowActionsJson),
            TicketWorkflowRuntime.DeserializeSteps(ticket.WorkflowStepsJson),
            TicketWorkflowRuntime.DeserializeStatusStepMap(ticket.WorkflowStatusStepMapJson),
            ticket.WorkflowCurrentStepKey,
            ticket.CurrentWorkState,
            ticket.CurrentBlockerReason,
            ticket.CurrentNextAction,
            ticket.SubjectGuidanceConfigId,
            ticket.SubjectGuidanceConfigName,
            ticket.VehicleText,
            ticket.LocationText,
            ticket.ContactPhone,
            ticket.ContactNote,
            ticket.ReceiverEmployeeId,
            ticket.ReceiverEmployee is null ? null : FullName(ticket.ReceiverEmployee),
            ticket.SupervisorAcceptedByEmployeeId,
            ticket.SupervisorAcceptedByEmployee is null ? null : FullName(ticket.SupervisorAcceptedByEmployee),
            ticket.SupervisorAcceptedAt,
            ticket.WorkStartedByEmployeeId,
            ticket.WorkStartedByEmployee is null ? null : FullName(ticket.WorkStartedByEmployee),
            ticket.WorkStartedAt,
            ticket.WaitingInfoByEmployeeId,
            ticket.WaitingInfoByEmployee is null ? null : FullName(ticket.WaitingInfoByEmployee),
            ticket.WaitingInfoAt,
            ticket.ProblemType,
            ticket.InitialInspectionNote,
            ticket.ResolutionNote,
            ticket.ResolvedByEmployeeId,
            ticket.ResolvedByEmployee is null ? null : FullName(ticket.ResolvedByEmployee),
            ticket.ResolvedAt,
            ticket.VerifiedByEmployeeId,
            ticket.VerifiedByEmployee is null ? null : FullName(ticket.VerifiedByEmployee),
            ticket.VerifiedAt,
            ticket.ClosedByEmployeeId,
            ticket.ClosedByEmployee is null ? null : FullName(ticket.ClosedByEmployee),
            ticket.ClosedAt,
            ticket.RejectedByEmployeeId,
            ticket.RejectedByEmployee is null ? null : FullName(ticket.RejectedByEmployee),
            ticket.RejectedAt,
            ticket.RejectionReason,
            ticket.CancelledByEmployeeId,
            ticket.CancelledByEmployee is null ? null : FullName(ticket.CancelledByEmployee),
            ticket.CancelledAt,
            ticket.CancellationReason,
            current is null ? null : ToAssignmentDto(current),
            ticket.ProgressEntries
                .OrderByDescending(entry => entry.CreatedAt)
                .Select(entry => new TicketProgressEntryDto(
                    entry.Id,
                    entry.WorkflowStepKey,
                    entry.WorkState,
                    entry.BlockerReason,
                    entry.NextAction,
                    entry.IsCompleted,
                    entry.Note,
                    entry.OwnerEmployeeId,
                    entry.OwnerEmployee is null ? null : FullName(entry.OwnerEmployee),
                    entry.DueAt,
                    entry.CreatedByEmployeeId,
                    entry.CreatedByExternalReporterId,
                    entry.CreatedByEmployee is null
                        ? ticket.RequesterNameSnapshot ?? "External requester"
                        : FullName(entry.CreatedByEmployee),
                    entry.CreatedAt,
                    entry.Attachments
                        .Where(attachment => canSeeInternalAttachments ||
                            attachment.Visibility == Hrms.Domain.Enums.TicketAttachmentVisibility.Public)
                        .OrderBy(attachment => attachment.CreatedAt)
                        .Select(attachment => new TicketAttachmentDto(
                            attachment.Id,
                            attachment.TicketProgressEntryId,
                            $"/tickets/{ticket.Id}/attachments/{attachment.Id}/content",
                            attachment.FileName,
                            InferContentType(attachment.ContentType, attachment.Url),
                            attachment.SizeBytes,
                            attachment.Stage,
                            attachment.Visibility))
                        .ToList()))
                .ToList(),
            ticket.Attachments
                .Where(a => canSeeInternalAttachments ||
                    a.Visibility == Hrms.Domain.Enums.TicketAttachmentVisibility.Public)
                .OrderBy(a => a.CreatedAt)
                .Select(a => new TicketAttachmentDto(
                    a.Id,
                    a.TicketProgressEntryId,
                    $"/tickets/{ticket.Id}/attachments/{a.Id}/content",
                    a.FileName,
                    InferContentType(a.ContentType, a.Url),
                    a.SizeBytes,
                    a.Stage,
                    a.Visibility))
                .ToList(),
            latestCancellation is null ? null : new TicketCancellationRequestDto(
                latestCancellation.Id,
                ticket.Id,
                ticket.TicketNo,
                ticket.Title,
                latestCancellation.RequestedByEmployeeId,
                latestCancellation.RequestedByExternalReporterId,
                latestCancellation.RequestedByEmployee is null
                    ? ticket.RequesterNameSnapshot ?? "External requester"
                    : FullName(latestCancellation.RequestedByEmployee),
                latestCancellation.Reason,
                latestCancellation.Status,
                latestCancellation.RequestedAt,
                latestCancellation.ReviewedByEmployeeId,
                latestCancellation.ReviewedByEmployee is null
                    ? null
                    : FullName(latestCancellation.ReviewedByEmployee),
                latestCancellation.ReviewedAt,
                latestCancellation.ReviewNote,
                ticket.TargetCompanyId,
                ticket.TargetCompany.Name,
                ticket.TargetDepartmentId,
                ticket.TargetDepartment?.Name,
                ticket.Status,
                ticket.UpdatedAt),
            auditEvents,
            actions,
            ticket.CreatedAt,
            ticket.UpdatedAt);
    }

    private static string FullName(Hrms.Domain.Entities.Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();

    private static string? InferContentType(string? contentType, string url)
    {
        if (!string.IsNullOrWhiteSpace(contentType)) return contentType;
        var path = Uri.TryCreate(url, UriKind.Absolute, out var absolute)
            ? absolute.AbsolutePath
            : url;
        return Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => null
        };
    }

    private static TicketAssignmentDto ToAssignmentDto(Hrms.Domain.Entities.TicketAssignment assignment)
        => new(
            assignment.Id,
            assignment.TicketId,
            assignment.AssignedToEmployeeId,
            FullName(assignment.AssignedToEmployee),
            assignment.AssignedByEmployeeId,
            assignment.AssignedByEmployee is null ? null : FullName(assignment.AssignedByEmployee),
            assignment.AssignedAt,
            assignment.IsPrimary,
            assignment.IsActive,
            assignment.EndedAt,
            assignment.EndedByEmployeeId,
            assignment.EndedByEmployee is null ? null : FullName(assignment.EndedByEmployee),
            assignment.Note,
            assignment.AssignmentSource,
            assignment.ResponsibilityId,
            assignment.RoutingLevelSnapshot);
}
