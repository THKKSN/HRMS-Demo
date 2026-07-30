using MediatR;

namespace Hrms.Application.Features.Dashboard.Queries.GetTeamDashboard;

public record GetTeamDashboardQuery : IRequest<TeamDashboardDto>;
