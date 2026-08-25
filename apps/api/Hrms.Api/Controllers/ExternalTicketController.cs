using Hrms.Api.Authorization;
using Hrms.Application.Features.ExternalTickets.Commands;
using Hrms.Application.Features.ExternalTickets.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/external")]
[Authorize(AuthenticationSchemes = ExternalAuthDefaults.Scheme, Policy = ExternalAuthDefaults.Policy)]
public sealed class ExternalTicketController(IMediator mediator) : ControllerBase
{
    // ฟอร์มเลือกหมวด/หมวดย่อย/หัวข้อสำหรับบุคคลภายนอก — คืนเฉพาะรายการ active และช่องทางเปิดใช้งานเท่านั้น
    [HttpGet("ticket-form")]
    public async Task<IActionResult> GetTicketForm(CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketFormQuery(), ct));

    [HttpPost("tickets")]
    [EnableRateLimiting("external_write")]
    public async Task<IActionResult> CreateTicket(
        [FromBody] CreateExternalTicketRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateExternalTicketCommand(
            request.ExternalTicketSubjectId,
            request.Detail,
            request.LocationText,
            request.ContactPhone,
            request.ContactNote,
            request.AttachmentUrls), ct);
        return Created($"/v1/external/tickets/{result.Id}", result);
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetExternalTicketsQuery(page, pageSize), ct));

    [HttpGet("tickets/{id:guid}")]
    public async Task<IActionResult> GetTicketDetail(Guid id, CancellationToken ct)
        => Ok(await mediator.Send(new GetExternalTicketDetailQuery(id), ct));
}

public sealed record CreateExternalTicketRequest(
    Guid ExternalTicketSubjectId,
    string Detail,
    string? LocationText,
    string? ContactPhone,
    string? ContactNote,
    IReadOnlyList<string>? AttachmentUrls);
