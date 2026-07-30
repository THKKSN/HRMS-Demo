using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.TicketReports;

public record GetTicketRoutingReportQuery(TicketReportFilter Filter) : IRequest<TicketRoutingReportDto>;

public class GetTicketRoutingReportHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetTicketRoutingReportQuery, TicketRoutingReportDto>
{
    public async Task<TicketRoutingReportDto> Handle(GetTicketRoutingReportQuery request, CancellationToken ct)
    {
        var scoped = await TicketReportAccess.ApplyScopeAsync(db.Tickets.AsNoTracking(), currentUser, permissions, ct);
        var values = await TicketReportAccess.ApplyFilters(scoped, request.Filter)
            .Where(t => t.RoutingOutcome != TicketRoutingOutcome.NotEvaluated)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                Evaluated = group.Count(),
                NoMatch = group.Count(t => t.RoutingOutcome == TicketRoutingOutcome.NoMatch),
                SupervisorQueue = group.Count(t => t.RoutingOutcome == TicketRoutingOutcome.SupervisorQueue),
                AutoAssigned = group.Count(t => t.RoutingOutcome == TicketRoutingOutcome.AutoAssigned)
            })
            .FirstOrDefaultAsync(ct);

        var evaluated = values?.Evaluated ?? 0;
        var matched = (values?.SupervisorQueue ?? 0) + (values?.AutoAssigned ?? 0);
        return new TicketRoutingReportDto(
            evaluated,
            values?.NoMatch ?? 0,
            values?.SupervisorQueue ?? 0,
            values?.AutoAssigned ?? 0,
            evaluated == 0 ? 0 : Math.Round((values?.AutoAssigned ?? 0) * 100d / evaluated, 2),
            evaluated == 0 ? 0 : Math.Round(matched * 100d / evaluated, 2),
            TicketReportAccess.Meta(request.Filter, currentUser));
    }
}
