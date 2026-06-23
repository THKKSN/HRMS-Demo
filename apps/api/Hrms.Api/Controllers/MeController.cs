using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Locations.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>Endpoints สำหรับ employee ทั่วไป (ไม่ต้องการ HR policy)</summary>
[ApiController]
[Route("v1/me")]
[Authorize]
public class MeController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการสถานที่ทำงานของ company ตัวเอง (ทุก role)</summary>
    [HttpGet("locations")]
    public async Task<IActionResult> GetMyCompanyLocations(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetMyCompanyLocationsQuery(), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}
