using Hrms.Application.Features.Address.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/address")]
[Authorize]
public class AddressController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการจังหวัดทั้งหมด</summary>
    [HttpGet("provinces")]
    public async Task<IActionResult> GetProvinces(CancellationToken ct)
    {
        var result = await mediator.Send(new GetProvincesQuery(), ct);
        return Ok(result);
    }

    /// <summary>รายการอำเภอ กรองตาม provinceId (optional)</summary>
    [HttpGet("districts")]
    public async Task<IActionResult> GetDistricts(
        [FromQuery] int? provinceId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetDistrictsQuery(provinceId), ct);
        return Ok(result);
    }

    /// <summary>รายการตำบล กรองตาม districtId (optional)</summary>
    [HttpGet("subdistricts")]
    public async Task<IActionResult> GetSubDistricts(
        [FromQuery] int? districtId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetSubDistrictsQuery(districtId), ct);
        return Ok(result);
    }

    /// <summary>รหัสไปรษณีย์ตาม subDistrictId</summary>
    [HttpGet("zipcode")]
    public async Task<IActionResult> GetZipCode(
        [FromQuery] int subDistrictId,
        CancellationToken ct)
    {
        var zipcode = await mediator.Send(new GetZipCodeQuery(subDistrictId), ct);
        if (zipcode is null)
            return NotFound();

        return Ok(new { zipcode });
    }
}
