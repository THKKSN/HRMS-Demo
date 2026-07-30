using Hrms.Application.Features.TicketReports;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/ticket-reports")]
[Authorize]
public class TicketReportController(IMediator mediator) : ControllerBase
{
    [HttpGet("scope")]
    public async Task<IActionResult> Scope(CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketReportScopeQuery(), ct));

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketReportSummaryQuery(request.ToFilter()), ct));

    [HttpGet("trend")]
    public async Task<IActionResult> Trend([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketTrendQuery(request.ToFilter()), ct));

    [HttpGet("backlog")]
    public async Task<IActionResult> Backlog(
        [FromQuery] TicketReportRequest request, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await mediator.Send(new GetTicketBacklogQuery(request.ToFilter(), page, pageSize), ct));

    [HttpGet("categories")]
    public async Task<IActionResult> Categories([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketCategoryReportQuery(request.ToFilter()), ct));

    [HttpGet("workload")]
    public async Task<IActionResult> Workload([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketWorkloadReportQuery(request.ToFilter()), ct));

    [HttpGet("quality")]
    public async Task<IActionResult> Quality([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketQualityReportQuery(request.ToFilter()), ct));

    [HttpGet("routing")]
    public async Task<IActionResult> Routing([FromQuery] TicketReportRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketRoutingReportQuery(request.ToFilter()), ct));

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] TicketReportRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new ExportTicketReportQuery(request.ToFilter()), ct);
        return File(result.Content, result.ContentType, result.FileName);
    }
}

public class TicketReportRequest
{
    public DateOnly? DateFrom { get; init; }
    public DateOnly? DateTo { get; init; }
    public Guid? CompanyId { get; init; }
    public Guid? DepartmentId { get; init; }
    public Guid? CategoryId { get; init; }
    public Guid? TopicId { get; init; }
    public TicketPriority? Priority { get; init; }
    public TicketStatus? Status { get; init; }
    public Guid? ResponsibleEmployeeId { get; init; }
    public TicketRequestType? RequestType { get; init; }
    public TicketProblemType? ProblemType { get; init; }
    public string DateBasis { get; init; } = "CreatedAt";

    public TicketReportFilter ToFilter() => new(
        DateFrom, DateTo, CompanyId, DepartmentId, CategoryId, TopicId,
        Priority, Status, ResponsibleEmployeeId, RequestType, ProblemType, DateBasis);
}
