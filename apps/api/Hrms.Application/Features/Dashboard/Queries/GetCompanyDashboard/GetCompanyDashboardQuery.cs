using MediatR;

namespace Hrms.Application.Features.Dashboard.Queries.GetCompanyDashboard;

public record GetCompanyDashboardQuery(Guid? CompanyId = null) : IRequest<CompanyDashboardDto>;
