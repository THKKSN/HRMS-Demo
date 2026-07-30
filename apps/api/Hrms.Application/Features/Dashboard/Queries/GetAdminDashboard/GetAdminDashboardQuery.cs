using MediatR;

namespace Hrms.Application.Features.Dashboard.Queries.GetAdminDashboard;

public record GetAdminDashboardQuery : IRequest<AdminDashboardDto>;
