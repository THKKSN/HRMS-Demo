using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hrms.Application.Features.Tickets.Commands;

public class CreateTicketHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog,
    ITicketRoutingService routingService,
    ITicketNumberGenerator ticketNumberGenerator,
    ITicketRequesterResolver requesterResolver) : IRequestHandler<CreateTicketCommand, TicketDto>
{
    public async Task<TicketDto> Handle(CreateTicketCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        if (!await permService.HasPermissionAsync(currentUser, "ticket:create", ct))
            throw new AppForbiddenException("Missing permission: ticket:create");

        if (request.RequestType != TicketRequestType.Internal)
            throw new FluentValidation.ValidationException(
                "Employee Ticket endpoint accepts Internal requests only");

        if (string.IsNullOrWhiteSpace(request.Detail))
            throw new BadRequestException("TICKET_DETAIL_REQUIRED", "Ticket detail is required.");

        var employee = await db.Employees
            .Include(e => e.Company)
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");
        var requester = requesterResolver.FromEmployee(employee);

        var targetDepartment = await db.Departments
            .Include(d => d.Company)
            .Include(d => d.ManagerEmployee)
            .FirstOrDefaultAsync(d =>
                d.Id == request.TargetDepartmentId &&
                d.CompanyId == request.TargetCompanyId &&
                d.IsActive &&
                d.Company.IsActive, ct)
            ?? throw new BadRequestException("TICKET_TARGET_DEPARTMENT_INVALID", "Target department not found or inactive.");

        var category = await db.TicketCategories
            .FirstOrDefaultAsync(c =>
                c.Id == request.CategoryId &&
                c.CompanyId == request.TargetCompanyId &&
                c.DepartmentId == request.TargetDepartmentId &&
                c.IsActive, ct)
            ?? throw new BadRequestException("TICKET_CATEGORY_INVALID", "Ticket category not found or inactive.");

        var topic = await db.TicketTopics
            .FirstOrDefaultAsync(t =>
                t.Id == request.TopicId &&
                t.CategoryId == request.CategoryId &&
                t.CompanyId == request.TargetCompanyId &&
                t.DepartmentId == request.TargetDepartmentId &&
                t.IsActive, ct)
            ?? throw new BadRequestException("TICKET_TOPIC_INVALID", "Ticket topic not found or inactive.");

        var subject = await db.TicketSubjects
            .FirstOrDefaultAsync(s =>
                s.Id == request.SubjectId &&
                s.TopicId == request.TopicId &&
                s.CategoryId == request.CategoryId &&
                s.CompanyId == request.TargetCompanyId &&
                s.DepartmentId == request.TargetDepartmentId &&
                s.IsActive, ct)
            ?? throw new BadRequestException("TICKET_SUBJECT_INVALID", "Ticket subject not found or inactive.");

        var otherTopicText = TrimOrNull(request.OtherTopicText);
        if (subject.Name.Trim().Equals("อื่น ๆ", StringComparison.OrdinalIgnoreCase) && otherTopicText is null)
            throw new BadRequestException("TICKET_OTHER_TOPIC_REQUIRED", "Other topic text is required when \"Other\" is selected.");

        var now = DateTime.UtcNow.AddHours(7);
        var uploadTokens = (request.AttachmentUrls ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(ParseUploadId)
            .Distinct()
            .ToList();
        if (uploadTokens.Count > 10)
            throw new BadRequestException("TICKET_CREATE_ATTACHMENT_LIMIT", "Up to 10 attachments are allowed when opening a ticket.");
        var pendingUploads = await db.TicketPendingUploads
            .Where(upload => uploadTokens.Contains(upload.Id) &&
                upload.UploadedByEmployeeId == employee.Id &&
                upload.LinkedAt == null)
            .ToListAsync(ct);
        if (pendingUploads.Count != uploadTokens.Count)
            throw new BadRequestException("UPLOAD_TOKEN_INVALID", "The uploaded file is invalid, already used, or belongs to another user.");

        var routing = await routingService.ResolveAsync(
            request.TargetCompanyId, request.TargetDepartmentId, request.CategoryId, request.TopicId,
            DateOnly.FromDateTime(now), ct);
        var resolvedGuidance = await TicketWorkflowRuntime.ResolveGuidanceAsync(
            db,
            request.TargetCompanyId,
            request.TargetDepartmentId,
            request.CategoryId,
            request.TopicId,
            subject.Id,
            ct);

        var ticket = new Ticket
        {
            TicketNo = await ticketNumberGenerator.NextAsync(DateOnly.FromDateTime(now), ct),
            RequestType = request.RequestType,
            RequesterEmployeeId = employee.Id,
            SourceCompanyId = employee.CompanyId,
            SourceDepartmentId = employee.DepartmentId,
            TargetCompanyId = request.TargetCompanyId,
            TargetDepartmentId = request.TargetDepartmentId,
            CategoryId = request.CategoryId,
            TopicId = request.TopicId,
            SubjectId = subject.Id,
            WorkflowDefinitionId = resolvedGuidance?.Workflow?.WorkflowDefinitionId,
            SubjectGuidanceConfigId = resolvedGuidance?.GuidanceConfigId,
            OtherTopicText = otherTopicText,
            Title = subject.Name.Trim(),
            Detail = request.Detail.Trim(),
            WorkflowName = resolvedGuidance?.Workflow?.Name,
            WorkflowBoardStepsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.BoardSteps),
            WorkflowInProgressPresetsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.InProgressPresets),
            WorkflowActionsJson = resolvedGuidance?.Workflow is null ? null : JsonSerializer.Serialize(resolvedGuidance.Workflow.Actions),
            WorkflowStepsJson = resolvedGuidance?.Workflow is null ? null : System.Text.Json.JsonSerializer.Serialize(resolvedGuidance.Workflow.Steps),
            WorkflowStatusStepMapJson = resolvedGuidance?.Workflow is null ? null : System.Text.Json.JsonSerializer.Serialize(resolvedGuidance.Workflow.CurrentStepIndexByStatus),
            WorkflowAutoAcknowledgeAfterDays = resolvedGuidance?.Workflow?.AutoAcknowledgeAfterDays,
            WorkflowCurrentStepKey = resolvedGuidance?.Workflow?.BoardSteps.FirstOrDefault()?.Key,
            SubjectGuidanceConfigName = resolvedGuidance?.GuidanceConfigName,
            Priority = request.Priority,
            Status = TicketStatus.Open,
            SourceChannel = TicketSourceChannelResolver.FromClientApp(currentUser.ClientApp),
            SourceClientApp = TicketSourceChannelResolver.NormalizeClientApp(currentUser.ClientApp),
            RoutingMode = routing.Mode,
            RoutingLevel = routing.Level,
            RoutingOutcome = routing.Outcome,
            VehicleText = TrimOrNull(request.VehicleText),
            LocationText = TrimOrNull(request.LocationText),
            ContactPhone = TrimOrNull(request.ContactPhone ?? employee.Phone),
            ContactNote = TrimOrNull(request.ContactNote),
            RequesterNameSnapshot = Bound(requester.DisplayName, 200),
            RequesterNicknameSnapshot = requester.Nickname is null ? null : Bound(requester.Nickname, 50),
            RequesterPhoneSnapshot = requester.Phone,
            RequesterEmailSnapshot = requester.Email,
            RequesterOrganizationSnapshot = requester.Organization,
            ReceiverEmployeeId = targetDepartment.ManagerEmployeeId
        };

        foreach (var upload in pendingUploads)
        {
            var attachment = new TicketAttachment
            {
                UploadedByEmployeeId = employee.Id,
                FileName = upload.FileName,
                ContentType = upload.ContentType,
                SizeBytes = upload.SizeBytes,
                StorageKey = upload.StorageKey,
                Stage = TicketAttachmentStage.Created,
                Visibility = TicketAttachmentVisibility.Public
            };
            attachment.Url = ContentUrl(ticket.Id, attachment.Id);
            ticket.Attachments.Add(attachment);
            upload.LinkedAt = now;
            upload.TicketAttachmentId = attachment.Id;
        }

        db.Tickets.Add(ticket);
        TicketStatusTransition.Record(
            db, ticket, null, TicketStatus.Open, employee.Id, ticket.CreatedAt, "TicketCreated");
        TicketAssignment? autoAssignment = null;
        var autoCandidate = routing.Outcome == TicketRoutingOutcome.AutoAssigned
            ? routing.Candidates.Single()
            : null;
        if (autoCandidate is not null)
        {
            autoAssignment = new TicketAssignment
            {
                TicketId = ticket.Id,
                AssignedToEmployeeId = autoCandidate.EmployeeId,
                AssignedByEmployeeId = null,
                AssignedAt = now,
                IsPrimary = true,
                IsActive = true,
                MemberRole = TicketAssignmentRole.Owner,
                ActiveSlot = "Primary",
                Note = routing.Level == TicketRoutingLevel.Topic
                    ? "Auto assigned from topic responsibility"
                    : "Auto assigned from category responsibility",
                AssignmentSource = routing.Level == TicketRoutingLevel.Topic
                    ? TicketAssignmentSource.AutoTopic
                    : TicketAssignmentSource.AutoCategory,
                ResponsibilityId = autoCandidate.ResponsibilityId,
                RoutingLevelSnapshot = routing.Level
            };
            db.TicketAssignments.Add(autoAssignment);
            ticket.Status = TicketStatus.Assigned;
            TicketStatusTransition.Record(db, ticket, TicketStatus.Open, TicketStatus.Assigned,
                null, now, autoAssignment.AssignmentSource.ToString(), autoAssignment.Id);
        }

        QueueRoutingNotifications(ticket, employee, targetDepartment, category, topic, routing);
        if (topic.SyncToExternalRepairSystem)
            TicketCommandSupport.QueueExternalRepairSync(
                db, ticket, targetDepartment.Company, targetDepartment, category, topic, subject);
        await db.ExecuteInTransactionAsync(async transactionCt =>
        {
            await db.SaveChangesAsync(transactionCt);
            await auditLog.LogAsync(
                "ticket", "Ticket", ticket.Id.ToString(), "create",
                $"{employee.FirstName} {employee.LastName} เปิดใบแจ้งเรื่อง {ticket.TicketNo}: {ticket.Title}",
                null, new { ticket.TicketNo, ticket.TargetCompanyId, ticket.TargetDepartmentId,
                    ticket.CategoryId, ticket.TopicId, ticket.SubjectId, ticket.Priority, ticket.Status,
                    ticket.SourceChannel, ticket.SourceClientApp,
                    routing.Level, routing.Mode, routing.Outcome }, transactionCt);
            var routingAction = routing.Outcome switch
            {
                TicketRoutingOutcome.AutoAssigned when routing.Level == TicketRoutingLevel.Topic => "auto-route-topic",
                TicketRoutingOutcome.AutoAssigned => "auto-route-category",
                TicketRoutingOutcome.SupervisorQueue => "routing-multiple-candidates",
                _ => "routing-no-match"
            };
            await auditLog.LogAsync("ticket", "Ticket", ticket.Id.ToString(), routingAction,
                $"Routing {ticket.TicketNo}: {routing.Outcome}", null,
                new { routing.Level, routing.Mode, routing.Outcome,
                    CandidateIds = routing.Candidates.Select(c => c.EmployeeId), AssignmentId = autoAssignment?.Id }, transactionCt);
        }, ct);

        return new TicketDto(
            ticket.Id,
            ticket.TicketNo,
            ticket.RequestType,
            employee.Id,
            requester.DisplayName,
            requester.ToDto(includeContact: true),
            employee.CompanyId,
            employee.DepartmentId,
            targetDepartment.CompanyId,
            targetDepartment.Company.Name,
            targetDepartment.Id,
            targetDepartment.Name,
            category.Id,
            category.Name,
            topic.Id,
            topic.Name,
            subject.Id,
            subject.Name,
            null,
            null,
            null,
            null,
            null,
            null,
            ticket.OtherTopicText,
            ticket.Title,
            ticket.Detail,
            ticket.Priority,
            ticket.Status,
            ticket.WorkflowDefinitionId,
            ticket.WorkflowName,
            ticket.WorkflowAutoAcknowledgeAfterDays,
            resolvedGuidance?.Workflow?.Steps ?? [],
            resolvedGuidance?.Workflow?.CurrentStepIndexByStatus ?? new Dictionary<TicketStatus, int>(),
            ticket.SubjectGuidanceConfigId,
            ticket.SubjectGuidanceConfigName,
            ticket.VehicleText,
            ticket.LocationText,
            ticket.ContactPhone,
            ticket.ContactNote,
            ticket.Attachments.Select(a => new TicketAttachmentDto(
                a.Id, a.TicketProgressEntryId, a.Url, a.FileName, a.ContentType, a.SizeBytes, a.Stage, a.Visibility)).ToList(),
            ticket.CreatedAt,
            new TicketRoutingSummaryDto(routing.Mode, routing.Level, routing.Outcome,
                autoCandidate?.EmployeeId, autoCandidate?.EmployeeName));
    }

    private static Guid ParseUploadId(string value)
    {
        const string prefix = "ticket-upload:";
        var token = value.Trim();
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
            !Guid.TryParse(token[prefix.Length..], out var uploadId))
            throw new BadRequestException("TICKET_ATTACHMENT_SOURCE_INVALID", "Attachments must be uploaded through the ticket upload endpoint.");
        return uploadId;
    }

    private static string ContentUrl(Guid ticketId, Guid attachmentId)
        => $"/tickets/{ticketId}/attachments/{attachmentId}/content";

    private void QueueRoutingNotifications(
        Ticket ticket,
        Employee requester,
        Department targetDepartment,
        TicketCategory category,
        TicketTopic topic,
        TicketRoutingResult routing)
    {
        var managerLineUserId = targetDepartment.ManagerEmployee?.LineUserId;
        var requesterName = $"{requester.FirstName} {requester.LastName}".Trim();
        // ชื่อแผนก/หมวด/หัวข้อ HR กรอกไว้หลายภาษา — เก็บไปให้ครบ แล้วให้ job เลือกตามภาษาผู้รับ (งาน N2.4)
        var localizedParams = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal)
        {
            ["department"] = LocalizedName.AllLocales(
                targetDepartment.Name, targetDepartment.NameEn, targetDepartment.NameId),
            ["taxonomy"] = Taxonomy(category, topic),
        };
        // งานภายในไม่ใช้สถานที่ — ไม่ต้องใส่ในข้อความแจ้งเตือน (external มี flow แจ้งเตือนแยกของตัวเอง)
        var managerParams = new
        {
            ticketNo = ticket.TicketNo,
            title = ticket.Title,
            requester = requesterName,
            // ป้าย enum เป็นคีย์ในแคตตาล็อก ไม่ใช่ข้อความไทย — job แปลตอนส่งตามภาษาผู้รับ
            priority = $"#enum.priority.{ticket.Priority}",
            routing = $"#enum.routing.{routing.Outcome}",
        };
        var sent = new HashSet<string>(StringComparer.Ordinal);
        if (!string.IsNullOrWhiteSpace(managerLineUserId))
        {
            sent.Add(managerLineUserId);
            TicketCommandSupport.QueueNotification(
                db, "TicketCreated", ticket.Id, targetDepartment.ManagerEmployeeId,
                managerLineUserId, "ticket.created.toManager", managerParams, ticket, localizedParams);
        }
        var autoAssigned = routing.Outcome == TicketRoutingOutcome.AutoAssigned;
        foreach (var candidate in routing.Candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate.LineUserId) || !sent.Add(candidate.LineUserId)) continue;
            TicketCommandSupport.QueueNotification(
                db, autoAssigned ? "TicketAssigned" : "TicketCreated",
                ticket.Id, candidate.EmployeeId, candidate.LineUserId,
                autoAssigned ? "ticket.created.toAutoAssignee" : "ticket.created.toCandidate",
                new
                {
                    ticketNo = ticket.TicketNo,
                    title = ticket.Title,
                },
                ticket,
                new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal)
                {
                    ["taxonomy"] = Taxonomy(category, topic),
                });
        }
        if (autoAssigned)
            TicketCommandSupport.QueueNotification(
                db, "TicketAssigned", ticket.Id, requester.Id, requester.LineUserId,
                "ticket.assigned.toRequester",
                new { ticketNo = ticket.TicketNo, owner = routing.Candidates[0].EmployeeName },
                ticket);
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Bound(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];

    /// <summary>
    /// "หมวด / หัวข้อ" ครบทุกภาษา — ตัวคั่น <c>/</c> ไม่ใช่คำ จึงต่อสตริงได้โดยไม่ผิดกติกา
    /// ห้ามต่อ string ข้ามภาษาใน CLAUDE.md
    /// </summary>
    private static Dictionary<string, string> Taxonomy(TicketCategory category, TicketTopic topic)
    {
        var categoryNames = LocalizedName.AllLocales(category.Name, category.NameEn, category.NameId);
        var topicNames = LocalizedName.AllLocales(topic.Name, topic.NameEn, topic.NameId);
        return categoryNames.ToDictionary(
            entry => entry.Key,
            entry => $"{entry.Value} / {topicNames[entry.Key]}",
            StringComparer.Ordinal);
    }
}
