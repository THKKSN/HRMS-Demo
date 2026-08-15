using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Application.Features.Tickets.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/ticket-workflows")]
[Authorize]
public class TicketWorkflowMasterController(IMediator mediator) : ControllerBase
{
    [HttpGet("manage")]
    public async Task<IActionResult> GetAll([FromQuery] Guid companyId, [FromQuery] Guid departmentId, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketWorkflowDefinitionsQuery(companyId, departmentId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketWorkflowDefinitionRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketWorkflowDefinitionCommand(
            request.CompanyId, request.DepartmentId, request.Code, request.Name, request.Description,
            request.SortOrder, request.AutoAcknowledgeAfterDays, request.Steps,
            request.InProgressPresets, request.Actions), ct);
        return Created($"/v1/ticket-workflows/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketWorkflowDefinitionRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketWorkflowDefinitionCommand(
            id, request.Code, request.Name, request.Description, request.SortOrder,
            request.AutoAcknowledgeAfterDays, request.IsActive, request.Steps,
            request.InProgressPresets, request.Actions), ct));
}

[ApiController]
[Route("v1/ticket-subject-guidance-configs")]
[Authorize]
public class TicketSubjectGuidanceConfigController(IMediator mediator) : ControllerBase
{
    [HttpGet("manage")]
    public async Task<IActionResult> GetAll([FromQuery] Guid companyId, [FromQuery] Guid departmentId, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketSubjectGuidanceConfigsQuery(companyId, departmentId), ct));

    [HttpGet("resolve")]
    public async Task<IActionResult> Resolve(
        [FromQuery] Guid companyId,
        [FromQuery] Guid departmentId,
        [FromQuery] Guid categoryId,
        [FromQuery] Guid topicId,
        [FromQuery] Guid subjectId,
        CancellationToken ct)
        => Ok(await mediator.Send(new ResolveTicketSubjectGuidanceQuery(
            companyId, departmentId, categoryId, topicId, subjectId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketSubjectGuidanceConfigRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateTicketSubjectGuidanceConfigCommand(
            request.CompanyId, request.DepartmentId, request.CategoryId, request.TopicId, request.SubjectId,
            request.WorkflowDefinitionId, request.Name, request.SuggestionTargetLabel, request.Suggestions,
            request.Template, request.Priority), ct);
        return Created($"/v1/ticket-subject-guidance-configs/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTicketSubjectGuidanceConfigRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateTicketSubjectGuidanceConfigCommand(
            id, request.CategoryId, request.TopicId, request.SubjectId, request.WorkflowDefinitionId,
            request.Name, request.SuggestionTargetLabel, request.Suggestions, request.Template,
            request.Priority, request.IsActive), ct));
}

public record CreateTicketWorkflowDefinitionRequest(
    Guid CompanyId,
    Guid DepartmentId,
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    int? AutoAcknowledgeAfterDays,
    IReadOnlyList<UpsertTicketWorkflowStepRequest> Steps,
    IReadOnlyList<UpsertTicketWorkflowPresetRequest>? InProgressPresets,
    IReadOnlyList<UpsertTicketWorkflowActionRequest>? Actions);

public record UpdateTicketWorkflowDefinitionRequest(
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    int? AutoAcknowledgeAfterDays,
    bool IsActive,
    IReadOnlyList<UpsertTicketWorkflowStepRequest> Steps,
    IReadOnlyList<UpsertTicketWorkflowPresetRequest>? InProgressPresets,
    IReadOnlyList<UpsertTicketWorkflowActionRequest>? Actions);

public record CreateTicketSubjectGuidanceConfigRequest(
    Guid CompanyId,
    Guid DepartmentId,
    Guid? CategoryId,
    Guid? TopicId,
    Guid? SubjectId,
    Guid? WorkflowDefinitionId,
    string Name,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    int Priority);

public record UpdateTicketSubjectGuidanceConfigRequest(
    Guid? CategoryId,
    Guid? TopicId,
    Guid? SubjectId,
    Guid? WorkflowDefinitionId,
    string Name,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    int Priority,
    bool IsActive);
