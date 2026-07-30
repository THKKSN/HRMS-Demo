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
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new CreateTicketCommand(
                request.RequestType,
                request.TargetCompanyId,
                request.TargetDepartmentId,
                request.CategoryId,
                request.TopicId,
                request.OtherTopicText,
                request.Title,
                request.Detail,
                request.Priority,
                request.VehicleText,
                request.LocationText,
                request.ContactPhone,
                request.ContactNote,
                request.AttachmentUrls), ct);

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage).DefaultIfEmpty(ex.Message) });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
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
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetTicketInboxQuery(
            companyId, departmentId, status, priority, categoryId, topicId,
            search, dateFrom, dateTo, page, pageSize), ct));

    [HttpGet("assigned")]
    public async Task<IActionResult> GetAssigned(
        [FromQuery] TicketStatus? status,
        [FromQuery] string? search,
        [FromQuery] bool history = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetAssignedTicketsQuery(status, search, history, page, pageSize), ct));

    [HttpGet("claimable")]
    public async Task<IActionResult> GetClaimable(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetClaimableTicketsQuery(search, page, pageSize), ct));

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
            id, request.CategoryId, request.TopicId, request.OtherTopicText,
            request.Priority, request.LocationText, request.VehicleText, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/assign")]
    public async Task<IActionResult> Assign(Guid id, [FromBody] AssignTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AssignTicketCommand(
            id, request.AssignedToEmployeeId, request.Note, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectTicketRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new RejectTicketCommand(id, request.Reason, request.ExpectedUpdatedAt), ct));

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id, [FromBody] TicketVersionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new StartTicketWorkCommand(id, request.ExpectedUpdatedAt), ct));

    [HttpPut("{id:guid}/work-detail")]
    public async Task<IActionResult> UpdateWorkDetail(Guid id, [FromBody] UpdateTicketWorkDetailRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketWorkDetailCommand(
            id, request.ProblemType, request.InitialInspectionNote, request.ResolutionNote, request.ExpectedUpdatedAt), ct));

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

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddTicketCommentRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddTicketCommentCommand(
            id, request.Message, request.CommentType, request.IsInternal), ct));

    [HttpPost("{id:guid}/attachments")]
    public async Task<IActionResult> AddAttachment(Guid id, [FromBody] AddTicketAttachmentRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new AddTicketAttachmentCommand(
            id, request.Url, request.FileName, request.ContentType, request.SizeBytes,
            request.Stage, request.Visibility), ct));

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
            request.CompanyId, request.DepartmentId, request.Name, request.Description, request.SortOrder), ct);
        return Created($"/v1/ticket-categories/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketCategoryCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive), ct));

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
            request.Name, request.Description, request.SortOrder), ct);
        return Created($"/v1/ticket-topics/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketTopicCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive), ct));

    [HttpPut("{id:guid}/routing")]
    public async Task<IActionResult> UpdateRouting(
        Guid id, [FromBody] TicketRoutingUpdateRequest request, CancellationToken ct)
    {
        await mediator.Send(new UpdateTopicRoutingCommand(id, request.Mode, request.ExpectedUpdatedAt), ct);
        return NoContent();
    }
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
    string? OtherTopicText,
    string Title,
    string Detail,
    TicketPriority Priority,
    string? VehicleText,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<string>? AttachmentUrls);

public record CreateTicketCategoryRequest(
    Guid CompanyId,
    Guid DepartmentId,
    string Name,
    string? Description,
    int SortOrder);

public record CreateTicketTopicRequest(
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    string Name,
    string? Description,
    int SortOrder);

public record UpdateTicketTaxonomyItemRequest(
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive);

public record TicketVersionRequest(DateTime? ExpectedUpdatedAt);

public record TriageTicketRequest(
    Guid CategoryId,
    Guid TopicId,
    string? OtherTopicText,
    TicketPriority Priority,
    string? LocationText,
    string? VehicleText,
    DateTime? ExpectedUpdatedAt);

public record AssignTicketRequest(
    Guid AssignedToEmployeeId,
    string? Note,
    DateTime? ExpectedUpdatedAt);

public record RejectTicketRequest(string Reason, DateTime? ExpectedUpdatedAt);

public record UpdateTicketWorkDetailRequest(
    TicketProblemType? ProblemType,
    string? InitialInspectionNote,
    string? ResolutionNote,
    DateTime? ExpectedUpdatedAt);

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
    TicketAttachmentVisibility Visibility = TicketAttachmentVisibility.Public);

public record ReviewTicketRequest(string? ReviewNote, DateTime? ExpectedUpdatedAt);

public record RequestTicketCancellationRequest(string Reason, DateTime? ExpectedUpdatedAt);

public record ReviewTicketCancellationRequest(string? ReviewNote, DateTime? ExpectedUpdatedAt);
