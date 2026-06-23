using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Companies.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Companies.Queries;

public record GetCompaniesQuery(bool IncludeInactive = false) : IRequest<IReadOnlyList<CompanyTreeDto>>;

public class GetCompaniesHandler(IApplicationDbContext db)
    : IRequestHandler<GetCompaniesQuery, IReadOnlyList<CompanyTreeDto>>
{
    public async Task<IReadOnlyList<CompanyTreeDto>> Handle(GetCompaniesQuery request, CancellationToken ct)
    {
        var all = await db.Companies
            .Where(c => request.IncludeInactive || c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        var lookup = all.ToLookup(c => c.ParentId);

        CompanyTreeDto BuildTree(Company c) => new(
            c.Id,
            c.Name,
            c.NameEn,
            c.OrgType.ToString(),
            c.IsActive,
            c.IsHeadquarters,
            lookup[c.Id].Select(BuildTree).ToList());

        return lookup[(Guid?)null].Select(BuildTree).ToList();
    }
}
