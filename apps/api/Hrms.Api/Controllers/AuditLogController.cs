using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.AuditLogs.Queries.GetAuditLogs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/audit-logs")]
[Authorize]
public class AuditLogController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการ Audit Log (Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? module,
        [FromQuery] string? entityType,
        [FromQuery] string? entityId,
        [FromQuery] string? action,
        [FromQuery] Guid? performedByEmployeeId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(
                new GetAuditLogsQuery(module, entityType, entityId, action, performedByEmployeeId, dateFrom, dateTo, page, pageSize),
                ct);
            return Ok(result);
        }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }
}
