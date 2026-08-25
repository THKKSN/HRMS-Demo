using Hrms.Application.Features.ExternalTickets.Commands;
using Hrms.Application.Features.ExternalTickets.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

// Admin-only — permission check (ticket:manage-external-config) เกิดในทุก handler อยู่แล้ว
// [Authorize] ตรงนี้แค่บังคับว่าต้อง login ด้วย employee token เท่านั้น (ไม่ใช่ external session)
[ApiController]
[Route("v1/external-ticket-config")]
[Authorize]
public class ExternalTicketConfigurationController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetConfiguration(CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketConfigurationQuery(), ct));

    [HttpPut]
    public async Task<IActionResult> UpdateConfiguration(
        [FromBody] UpdateExternalTicketConfigurationRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalTicketConfigurationCommand(
            request.RequireOaFriendship,
            request.IsEnabled, request.ExpectedUpdatedAt), ct));

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketCategoriesQuery(), ct));

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateExternalTicketCategoryRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateExternalTicketCategoryCommand(
            request.Name, request.Description, request.SortOrder), ct);
        return Created($"/v1/external-ticket-config/categories/{result.Id}", result);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(
        Guid id, [FromBody] UpdateExternalTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalTicketCategoryCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive), ct));

    [HttpGet("topics")]
    public async Task<IActionResult> GetTopics([FromQuery] Guid categoryId, CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketTopicsQuery(categoryId), ct));

    [HttpPost("topics")]
    public async Task<IActionResult> CreateTopic(
        [FromBody] CreateExternalTicketTopicRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateExternalTicketTopicCommand(
            request.ExternalTicketCategoryId, request.Name, request.Description, request.SortOrder), ct);
        return Created($"/v1/external-ticket-config/topics/{result.Id}", result);
    }

    [HttpPut("topics/{id:guid}")]
    public async Task<IActionResult> UpdateTopic(
        Guid id, [FromBody] UpdateExternalTicketTaxonomyItemRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalTicketTopicCommand(
            id, request.Name, request.Description, request.SortOrder, request.IsActive), ct));

    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects([FromQuery] Guid topicId, CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketSubjectsQuery(topicId), ct));

    [HttpPost("subjects")]
    public async Task<IActionResult> CreateSubject(
        [FromBody] CreateExternalTicketSubjectRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateExternalTicketSubjectCommand(
            request.ExternalTicketTopicId,
            request.Name, request.Description,
            request.Template, request.Suggestions, request.SortOrder), ct);
        return Created($"/v1/external-ticket-config/subjects/{result.Id}", result);
    }

    [HttpPut("subjects/{id:guid}")]
    public async Task<IActionResult> UpdateSubject(
        Guid id, [FromBody] UpdateExternalTicketSubjectRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalTicketSubjectCommand(
            id, request.Name, request.Description,
            request.Template, request.Suggestions,
            request.SortOrder, request.IsActive), ct));
}

public record UpdateExternalTicketConfigurationRequest(
    bool RequireOaFriendship,
    bool IsEnabled,
    DateTime ExpectedUpdatedAt);

public record CreateExternalTicketCategoryRequest(
    string Name,
    string? Description,
    int SortOrder);

public record CreateExternalTicketTopicRequest(
    Guid ExternalTicketCategoryId,
    string Name,
    string? Description,
    int SortOrder);

public record CreateExternalTicketSubjectRequest(
    Guid ExternalTicketTopicId,
    string Name,
    string? Description,
    string? Template,
    IReadOnlyList<string>? Suggestions,
    int SortOrder);

public record UpdateExternalTicketTaxonomyItemRequest(
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive);

public record UpdateExternalTicketSubjectRequest(
    string Name,
    string? Description,
    string? Template,
    IReadOnlyList<string>? Suggestions,
    int SortOrder,
    bool IsActive);
