using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Address.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Address.Queries;

public record GetSubDistrictsQuery(int? DistrictId) : IRequest<IReadOnlyList<SubDistrictDto>>;

public class GetSubDistrictsHandler(IApplicationDbContext db)
    : IRequestHandler<GetSubDistrictsQuery, IReadOnlyList<SubDistrictDto>>
{
    public async Task<IReadOnlyList<SubDistrictDto>> Handle(GetSubDistrictsQuery request, CancellationToken ct)
    {
        var query = db.SubDistricts.AsQueryable();

        if (request.DistrictId.HasValue)
            query = query.Where(s => s.DistrictId == request.DistrictId.Value);

        return await query
            .OrderBy(s => s.SubDistrictId)
            .Select(s => new SubDistrictDto(s.SubDistrictId, s.SubDistrictName, s.DistrictId, s.ProvinceId))
            .ToListAsync(ct);
    }
}
