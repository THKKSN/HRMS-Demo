using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Address.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Address.Queries;

public record GetDistrictsQuery(int? ProvinceId) : IRequest<IReadOnlyList<DistrictDto>>;

public class GetDistrictsHandler(IApplicationDbContext db)
    : IRequestHandler<GetDistrictsQuery, IReadOnlyList<DistrictDto>>
{
    public async Task<IReadOnlyList<DistrictDto>> Handle(GetDistrictsQuery request, CancellationToken ct)
    {
        var query = db.Districts.AsQueryable();

        if (request.ProvinceId.HasValue)
            query = query.Where(d => d.ProvinceId == request.ProvinceId.Value);

        return await query
            .OrderBy(d => d.DistrictId)
            .Select(d => new DistrictDto(d.DistrictId, d.DistrictName, d.ProvinceId))
            .ToListAsync(ct);
    }
}
