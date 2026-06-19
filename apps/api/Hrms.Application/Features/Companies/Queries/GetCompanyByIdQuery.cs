using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Companies.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Companies.Queries;

public record GetCompanyByIdQuery(Guid Id) : IRequest<CompanyDto>;

public class GetCompanyByIdHandler(IApplicationDbContext db)
    : IRequestHandler<GetCompanyByIdQuery, CompanyDto>
{
    public async Task<CompanyDto> Handle(GetCompanyByIdQuery request, CancellationToken ct)
    {
        var company = await db.Companies
            .Include(c => c.Parent)
            .FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลบริษัท");

        return new CompanyDto(
            company.Id,
            company.Name,
            company.NameEn,
            company.OrgType.ToString(),
            company.ParentId,
            company.Parent?.Name,
            company.IsActive);
    }
}
