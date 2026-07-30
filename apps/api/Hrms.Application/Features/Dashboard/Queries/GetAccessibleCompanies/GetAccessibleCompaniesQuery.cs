using MediatR;

namespace Hrms.Application.Features.Dashboard.Queries.GetAccessibleCompanies;

public record GetAccessibleCompaniesQuery : IRequest<IReadOnlyList<AccessibleCompanyItem>>;

public record AccessibleCompanyItem(
    Guid Id,
    string Name,
    Guid? ParentId,
    bool IsHeadquarters,
    int Level);
