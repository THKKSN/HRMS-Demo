using MediatR;

namespace Hrms.Application.Features.Dashboard.Queries.GetMyDashboard;

public record GetMyDashboardQuery : IRequest<MyDashboardDto>;
