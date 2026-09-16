using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Queries;
using Hrms.Application.Features.TicketRouting;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/tickets")]
[Authorize]
public class TicketController(IMediator mediator, IFileStorageService storage) : ControllerBase
{
    /// <summary>เปิดใบแจ้งเรื่อง</summary>
    // ไม่ดัก exception เอง — GlobalExceptionMiddleware ตอบ { traceId, error, message } รูปแบบเดียวกันทั้งระบบ
    // (ของเดิมดักเองแล้วส่ง `error` เป็น "ข้อความ" ไม่ใช่ code หน้าจอจึงหาคำแปลไม่เจอ — กติกา D7)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketCommand(
            request.RequestType,
            request.TargetCompanyId,
            request.TargetDepartmentId,
            request.CategoryId,
            request.TopicId,
            request.SubjectId,
            request.OtherTopicText,
            request.Detail,
            request.Priority,
            request.VehicleText,
            request.LocationText,
            request.ContactPhone,
            request.ContactNote,
            request.AttachmentUrls), ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketDetailQuery(id), ct));

    [HttpGet("{id:guid}/attachments/{attachmentId:guid}/content")]
    public async Task<IActionResult> GetAttachmentContent(
        Guid id,
        Guid attachmentId,
        CancellationToken ct)
    {
        var descriptor = await mediator.Send(
            new GetTicketAttachmentContentQuery(id, attachmentId), ct);
        var stream = await storage.OpenTicketReadAsync(descriptor.StorageKey, ct);
        return File(stream, descriptor.ContentType, descriptor.FileName, enableRangeProcessing: true);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMy(
        [FromQuery] TicketStatus? status,
        [FromQuery] string? search,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetMyTicketsQuery(
            status, search, dateFrom, dateTo, page, pageSize), ct));

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? departmentId,
        [FromQuery] TicketStatus? status,
        [FromQuery] TicketPriority? priority,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? topicId,
        [FromQuery] string? search,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] TicketRequestType? requestType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetTicketInboxQuery(
            companyId, departmentId, status, priority, categoryId, topicId,
            search, dateFrom, dateTo, requestType, page, pageSize), ct));

    [HttpGet("assigned")]
    public async Task<IActionResult> GetAssigned(
        [FromQuery] TicketStatus? status,
        [FromQuery] string? search,
        [FromQuery] bool history = false,
        [FromQuery] TicketRequestType? requestType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] AssignedTicketScope? scope = null,
        CancellationToken ct = default)
        => Ok(await mediator.Send(
            new GetAssignedTicketsQuery(status, search, history, requestType, page, pageSize, scope), ct));

    [HttpGet("claimable")]
    public async Task<IActionResult> GetClaimable(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetClaimableTicketsQuery(search, page, pageSize), ct));

    [HttpGet("pending-counts")]
    public async Task<IActionResult> GetPendingCounts(CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketPendingCountsQuery(), ct));

    [HttpGet("cancellation-pending")]
    public async Task<IActionResult> GetPendingCancellations(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
        => Ok(await mediator.Send(
            new GetPendingTicketCancellationsQuery(search, page, pageSize), ct));

    [HttpGet("{id:guid}/timeline")]
    public async Task<IActionResult> GetTimeline(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketTimelineQuery(id), ct));

    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketCommentsQuery(id), ct));

    [HttpGet("{id:guid}/reviews")]
    public async Task<IActionResult> GetReviews(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketReviewsQuery(id), ct));

    [HttpGet("{id:guid}/assignment-history")]
    public async Task<IActionResult> GetAssignmentHistory(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketAssignmentHistoryQuery(id), ct));

    [HttpGet("{id:guid}/assignment-candidates")]
    public async Task<IActionResult> GetAssignmentCandidates(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketAssignmentCandidatesQuery(id), ct));

    [HttpPost("{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AcceptTicketCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/claim")]
    public async Task<IActionResult> Claim(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ClaimTicketCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPut("{id:guid}/triage")]
    public async Task<IActionResult> Triage(Guid id, [FromBody] TriageTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new TriageTicketCommand(
            id, request.CategoryId, request.TopicId, request.SubjectId, request.OtherTopicText, request.Detail,
            request.Priority, request.LocationText, request.VehicleText, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/assign")]
    public async Task<IActionResult> Assign(Guid id, [FromBody] AssignTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AssignTicketCommand(
            id, request.AssignedToEmployeeId, request.Note, request.ExpectedUpdatedAt), ct));

    [HttpGet("{id:guid}/team")]
    public async Task<IActionResult> GetTeam(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketTeamQuery(id), ct));

    [HttpPost("{id:guid}/team")]
    public async Task<IActionResult> AddTeamMembers(
        Guid id, [FromBody] AddTicketTeamMembersRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddTicketTeamMembersCommand(
            id, request.EmployeeIds, request.Note, request.ExpectedUpdatedAt), ct));

    [HttpGet("{id:guid}/team-template-options")]
    public async Task<IActionResult> GetTeamTemplateOptions(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketTeamTemplateOptionsQuery(id), ct));

    [HttpPost("{id:guid}/team/apply-template")]
    public async Task<IActionResult> ApplyTeamTemplate(
        Guid id, [FromBody] ApplyTicketTeamTemplateRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ApplyTicketTeamTemplateCommand(
            id, request.TemplateId, request.ExpectedUpdatedAt), ct));

    [HttpDelete("{id:guid}/team/{employeeId:guid}")]
    public async Task<IActionResult> RemoveTeamMember(
        Guid id, Guid employeeId, [FromQuery] DateTime? expectedUpdatedAt, CancellationToken ct)
        => Ok(await mediator.Send(new RemoveTicketTeamMemberCommand(id, employeeId, expectedUpdatedAt), ct));

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new RejectTicketCommand(id, request.Reason, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new StartTicketWorkCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPut("{id:guid}/work-detail")]
    public async Task<IActionResult> UpdateWorkDetail(Guid id, [FromBody] UpdateTicketWorkDetailRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketWorkDetailCommand(
            id, request.ProblemType, request.InitialInspectionNote, request.ResolutionNote, request.CloseoutReasonId, request.ExpectedUpdatedAt), ct));

    [HttpGet("{id:guid}/closeout-reason-options")]
    public async Task<IActionResult> GetCloseoutReasonOptions(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketCloseoutReasonOptionsQuery(id), ct));

    [HttpPost("{id:guid}/progress")]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] UpdateTicketProgressRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketProgressCommand(
            id, request.WorkState, request.BlockerReason, request.NextAction, request.IsCompleted, request.Note,
            request.ExpectedUpdatedAt, request.OwnerEmployeeId), ct));

    [HttpPut("{id:guid}/progress/{entryId:guid}")]
    public async Task<IActionResult> UpdateProgressEntry(
        Guid id,
        Guid entryId,
        [FromBody] UpdateTicketProgressEntryRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketProgressEntryCommand(
            id, entryId, request.WorkState, request.BlockerReason, request.NextAction, request.Note,
            request.ExpectedUpdatedAt, request.OwnerEmployeeId), ct));

    [HttpPatch("{id:guid}/progress/{entryId:guid}/pin")]
    public async Task<IActionResult> PinProgressEntry(
        Guid id,
        Guid entryId,
        [FromBody] PinTicketProgressEntryRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new PinTicketProgressEntryCommand(
            id, entryId, request.IsPinned, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/request-info")]
    public async Task<IActionResult> RequestInfo(Guid id, [FromBody] RequestTicketInfoRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new RequestTicketInfoCommand(id, request.Message, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/resume")]
    public async Task<IActionResult> Resume(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ResumeTicketWorkCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ResolveTicketCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/cancellation-request")]
    public async Task<IActionResult> RequestCancellation(
        Guid id,
        [FromBody] RequestTicketCancellationRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new RequestTicketCancellationCommand(
            id, request.Reason, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/cancellation/approve")]
    public async Task<IActionResult> ApproveCancellation(
        Guid id,
        [FromBody] ReviewTicketCancellationRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new ApproveTicketCancellationCommand(
            id, request.ReviewNote, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/cancellation/reject")]
    public async Task<IActionResult> RejectCancellation(
        Guid id,
        [FromBody] ReviewTicketCancellationRequest request,
        CancellationToken ct)
        => Ok(await mediator.Send(new RejectTicketCancellationCommand(
            id, request.ReviewNote ?? string.Empty, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/return")]
    public async Task<IActionResult> ReturnForRevision(Guid id, [FromBody] ReviewTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ReturnTicketForRevisionCommand(
            id, request.ReviewNote ?? string.Empty, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id, [FromBody] ReviewTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new CloseTicketCommand(id, request.ReviewNote, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/confirm-completion")]
    public async Task<IActionResult> ConfirmCompletion(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new ConfirmTicketCompletionCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddTicketCommentRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddTicketCommentCommand(
            id, request.Message, request.CommentType, request.IsInternal), ct));

    [HttpPost("{id:guid}/attachments")]
    public async Task<IActionResult> AddAttachment(Guid id, [FromBody] AddTicketAttachmentRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddTicketAttachmentCommand(
            id, request.Url, request.FileName, request.ContentType, request.SizeBytes,
            request.Stage, request.Visibility, request.TicketProgressEntryId), ct));

    [HttpDelete("{id:guid}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(Guid id, Guid attachmentId, CancellationToken ct)
    {
        await mediator.Send(new DeleteTicketAttachmentCommand(id, attachmentId), ct);
        return NoContent();
    }
}

[ApiController]
[Route("v1/ticket-lookups")]
[Authorize]
public class TicketLookupController(IMediator mediator) : ControllerBase
{
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketLookupCompaniesQuery(), ct));

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments([FromQuery] Guid? companyId, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketLookupDepartmentsQuery(companyId), ct));
}

[ApiController]
[Route("v1/ticket-categories")]
[Authorize]
public class TicketCategoryController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? departmentId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketCategoriesQuery(companyId, departmentId), ct));

    [HttpGet("manage")]
    public async Task<IActionResult> GetManaged(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetManagedTicketCategoriesQuery(companyId, departmentId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketCategoryRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketCategoryCommand(
            request.CompanyId, request.DepartmentId, request.Name, request.Description, request.SortOrder,
            request.NameEn, request.NameId), ct);
        return Created($"/v1/ticket-categories/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketCategoryCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive,
            request.NameEn, request.NameId), ct));

    [HttpPut("{id:guid}/routing")]
    public async Task<IActionResult> UpdateRouting(
        Guid id, [FromBody] TicketCategoryRoutingUpdateRequest request, CancellationToken ct)
    {
        await mediator.Send(new UpdateCategoryRoutingCommand(
            id, request.EnableFallback, request.Mode, request.ExpectedUpdatedAt), ct);
        return NoContent();
    }
}

[ApiController]
[Route("v1/ticket-closeout-reasons")]
[Authorize]
public class TicketCloseoutReasonController(IMediator mediator) : ControllerBase
{
    [HttpGet("manage")]
    public async Task<IActionResult> GetManaged(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetManagedTicketCloseoutReasonsQuery(companyId, departmentId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketCloseoutReasonRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketCloseoutReasonCommand(
            request.CompanyId, request.DepartmentId, request.Name, request.Description, request.SortOrder, request.CategoryIds,
            request.RequiresResolutionNote, request.RequiresCompletionEvidence,
            request.NameEn, request.NameId), ct);
        return Created($"/v1/ticket-closeout-reasons/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketCloseoutReasonRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketCloseoutReasonCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive, request.CategoryIds,
            request.RequiresResolutionNote, request.RequiresCompletionEvidence,
            request.NameEn, request.NameId), ct));
}

[ApiController]
[Route("v1/ticket-team-templates")]
[Authorize]
public class TicketTeamTemplateController(IMediator mediator) : ControllerBase
{
    [HttpGet("manage")]
    public async Task<IActionResult> GetManaged(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetManagedTicketTeamTemplatesQuery(companyId, departmentId), ct));

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTicketTeamTemplateRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketTeamTemplateCommand(
            request.CompanyId, request.DepartmentId, request.Name, request.Description,
            request.SortOrder, request.EmployeeIds), ct);
        return Created($"/v1/ticket-team-templates/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] UpdateTicketTeamTemplateRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketTeamTemplateCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive,
            request.EmployeeIds), ct));
}

[ApiController]
[Route("v1/ticket-topics")]
[Authorize]
public class TicketTopicController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? departmentId,
        [FromQuery] Guid? categoryId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketTopicsQuery(companyId, departmentId, categoryId), ct));

    [HttpGet("manage")]
    public async Task<IActionResult> GetManaged(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        [FromQuery] Guid categoryId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetManagedTicketTopicsQuery(companyId, departmentId, categoryId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketTopicRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketTopicCommand(
            request.CompanyId, request.DepartmentId, request.CategoryId,
            request.Name, request.Description, request.SortOrder, request.SyncToExternalRepairSystem,
            request.NameEn, request.NameId), ct);
        return Created($"/v1/ticket-topics/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketTopicCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive, request.SyncToExternalRepairSystem,
            request.NameEn, request.NameId), ct));

    [HttpPut("{id:guid}/routing")]
    public async Task<IActionResult> UpdateRouting(
        Guid id, [FromBody] TicketRoutingUpdateRequest request, CancellationToken ct)
    {
        await mediator.Send(new UpdateTopicRoutingCommand(id, request.Mode, request.ExpectedUpdatedAt), ct);
        return NoContent();
    }
}

[ApiController]
[Route("v1/ticket-subjects")]
[Authorize]
public class TicketSubjectController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? departmentId,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? topicId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketSubjectsQuery(companyId, departmentId, categoryId, topicId), ct));

    [HttpGet("manage")]
    public async Task<IActionResult> GetManaged(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        [FromQuery] Guid categoryId,
        [FromQuery] Guid topicId,
        CancellationToken ct)
        => Ok(await mediator.Send(new GetManagedTicketSubjectsQuery(companyId, departmentId, categoryId, topicId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketSubjectRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketSubjectCommand(
            request.CompanyId, request.DepartmentId, request.CategoryId, request.TopicId,
            request.Name, request.Description, request.SortOrder,
            request.NameEn, request.NameId), ct);
        return Created($"/v1/ticket-subjects/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketSubjectCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive,
            request.NameEn, request.NameId), ct));
}

[ApiController]
[Route("v1/ticket-management")]
[Authorize]
public class TicketManagementController(IMediator mediator) : ControllerBase
{
    [HttpGet("scope")]
    public async Task<IActionResult> GetScope(CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketManagementScopeQuery(), ct));
}

public record CreateTicketRequest(
    TicketRequestType RequestType,
    Guid TargetCompanyId,
    Guid TargetDepartmentId,
    Guid CategoryId,
    Guid TopicId,
    Guid SubjectId,
    string? OtherTopicText,
    string Detail,
    TicketPriority Priority,
    string? VehicleText,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<string>? AttachmentUrls);

// NameEn/NameId = ชื่อหลายภาษาของ master data (i18n Phase M) — ไม่ส่ง = คงค่าเดิม, ส่ง "" = ล้างค่า
public record CreateTicketCategoryRequest(
    Guid CompanyId,
    Guid DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    string? NameEn = null,
    string? NameId = null);

public record CreateTicketTopicRequest(
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    string Name,
    string? Description,
    int SortOrder,
    bool SyncToExternalRepairSystem = false,
    string? NameEn = null,
    string? NameId = null);

public record CreateTicketSubjectRequest(
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    Guid TopicId,
    string Name,
    string? Description,
    int SortOrder,
    string? NameEn = null,
    string? NameId = null);

public record UpdateTicketTaxonomyItemRequest(
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    bool SyncToExternalRepairSystem = false,
    string? NameEn = null,
    string? NameId = null);

public record TicketVersionRequest(DateTime? ExpectedUpdatedAt);

public record TriageTicketRequest(
    Guid CategoryId,
    Guid TopicId,
    Guid? SubjectId,
    string? OtherTopicText,
    string? Detail,
    TicketPriority Priority,
    string? LocationText,
    string? VehicleText,
    DateTime? ExpectedUpdatedAt);

public record AssignTicketRequest(
    Guid AssignedToEmployeeId,
    string? Note,
    DateTime? ExpectedUpdatedAt);

public record RejectTicketRequest(string Reason, DateTime? ExpectedUpdatedAt);

public record AddTicketTeamMembersRequest(
    IReadOnlyList<Guid> EmployeeIds,
    string? Note,
    DateTime? ExpectedUpdatedAt);

public record ApplyTicketTeamTemplateRequest(Guid TemplateId, DateTime? ExpectedUpdatedAt);

public record CreateTicketTeamTemplateRequest(
    Guid CompanyId,
    Guid? DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<Guid> EmployeeIds);

public record UpdateTicketTeamTemplateRequest(
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<Guid> EmployeeIds);

public record UpdateTicketWorkDetailRequest(
    TicketProblemType? ProblemType,
    string? InitialInspectionNote,
    string? ResolutionNote,
    DateTime? ExpectedUpdatedAt,
    Guid? CloseoutReasonId = null);

public record CreateTicketCloseoutReasonRequest(
    Guid CompanyId,
    Guid? DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<Guid>? CategoryIds,
    bool RequiresResolutionNote = true,
    bool RequiresCompletionEvidence = true,
    string? NameEn = null,
    string? NameId = null);

public record UpdateTicketCloseoutReasonRequest(
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<Guid>? CategoryIds,
    bool RequiresResolutionNote = true,
    bool RequiresCompletionEvidence = true,
    string? NameEn = null,
    string? NameId = null);

public record UpdateTicketProgressRequest(
    string? WorkState,
    string? BlockerReason,
    string? NextAction,
    bool IsCompleted,
    string? Note,
    DateTime? ExpectedUpdatedAt,
    Guid? OwnerEmployeeId = null);

public record UpdateTicketProgressEntryRequest(
    string? WorkState,
    string? BlockerReason,
    string? NextAction,
    string? Note,
    DateTime? ExpectedUpdatedAt,
    Guid? OwnerEmployeeId = null);

public record PinTicketProgressEntryRequest(bool IsPinned, DateTime? ExpectedUpdatedAt);

public record RequestTicketInfoRequest(string Message, DateTime? ExpectedUpdatedAt);

public record AddTicketCommentRequest(
    string Message,
    TicketCommentType CommentType = TicketCommentType.General,
    bool IsInternal = false);

public record AddTicketAttachmentRequest(
    string Url,
    string? FileName,
    string? ContentType,
    long SizeBytes,
    TicketAttachmentStage Stage,
    TicketAttachmentVisibility Visibility = TicketAttachmentVisibility.Public,
    Guid? TicketProgressEntryId = null);

public record ReviewTicketRequest(string? ReviewNote, DateTime? ExpectedUpdatedAt);

public record RequestTicketCancellationRequest(string Reason, DateTime? ExpectedUpdatedAt);

public record ReviewTicketCancellationRequest(string? ReviewNote, DateTime? ExpectedUpdatedAt);
