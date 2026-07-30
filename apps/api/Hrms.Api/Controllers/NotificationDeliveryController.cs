using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.NotificationDeliveries.Commands;
using Hrms.Application.Features.NotificationDeliveries.Queries;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/notification-deliveries")]
[Authorize]
public class NotificationDeliveryController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] NotificationDeliveryStatus? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await mediator.Send(
                new GetNotificationDeliveriesQuery(status, search, page, pageSize), ct));
        }
        catch (AppForbiddenException) { return Forbid(); }
    }

    [HttpPost("{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new RetryNotificationDeliveryCommand(id), ct);
            return NoContent();
        }
        catch (AppForbiddenException) { return Forbid(); }
    }
}
