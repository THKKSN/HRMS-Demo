using Hrms.Application.Features.MemoReports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/memo-reports")]
[Authorize]
public class MemoReportController(IMediator mediator) : ControllerBase
{
    // สิทธิ์ตรวจใน MemoReportAccess (memo:approve หรือ memo:view-inbox) — ไม่ผูก policy ที่ระดับ controller
    // เพราะสองบทบาทใช้ permission คนละตัวแต่เข้า endpoint เดียวกัน
    [HttpGet("overview")]
    public async Task<IActionResult> Overview(
        [FromQuery] MemoReportRequest request, [FromQuery] int topLimit = 10, CancellationToken ct = default)
        => Ok(await mediator.Send(new GetMemoOverviewQuery(request.ToFilter(), topLimit), ct));
}

public class MemoReportRequest
{
    public DateOnly? DateFrom { get; init; }
    public DateOnly? DateTo { get; init; }
    public Guid? CompanyId { get; init; }

    public MemoReportFilter ToFilter() => new(DateFrom, DateTo, CompanyId);
}
