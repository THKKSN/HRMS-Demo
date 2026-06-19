using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Address.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Address.Queries;

public record GetProvincesQuery : IRequest<IReadOnlyList<ProvinceDto>>;

public class GetProvincesHandler(IApplicationDbContext db)
    : IRequestHandler<GetProvincesQuery, IReadOnlyList<ProvinceDto>>
{
    public async Task<IReadOnlyList<ProvinceDto>> Handle(GetProvincesQuery request, CancellationToken ct)
    {
        return await db.Provinces
            .OrderBy(p => p.ProvinceId)
            .Select(p => new ProvinceDto(p.ProvinceId, p.ProvinceName))
            .ToListAsync(ct);
    }
}
