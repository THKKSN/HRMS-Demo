using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Locations.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Locations.Queries;

public record GetMyCompanyLocationsQuery : IRequest<IReadOnlyList<LocationDto>>;

public class GetMyCompanyLocationsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetMyCompanyLocationsQuery, IReadOnlyList<LocationDto>>
{
    public async Task<IReadOnlyList<LocationDto>> Handle(
        GetMyCompanyLocationsQuery request, CancellationToken ct)
    {
        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var list = await db.Locations
            .Include(l => l.Province)
            .Include(l => l.District)
            .Include(l => l.SubDistrict)
            .Where(l => l.CompanyId == companyId && l.IsActive)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);

        return list.Select(l => new LocationDto(
            l.Id,
            l.CompanyId,
            l.Name,
            l.Latitude,
            l.Longitude,
            l.RadiusMeters,
            l.Address,
            l.ProvinceId,
            l.Province?.ProvinceName,
            l.DistrictId,
            l.District?.DistrictName,
            l.SubDistrictId,
            l.SubDistrict?.SubDistrictName,
            l.IsActive)).ToList();
    }
}
