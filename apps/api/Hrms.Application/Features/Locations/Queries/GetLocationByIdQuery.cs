using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Locations.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Locations.Queries;

public record GetLocationByIdQuery(Guid Id) : IRequest<LocationDto>;

public class GetLocationByIdHandler(IApplicationDbContext db)
    : IRequestHandler<GetLocationByIdQuery, LocationDto>
{
    public async Task<LocationDto> Handle(GetLocationByIdQuery request, CancellationToken ct)
    {
        var l = await db.Locations
            .Include(x => x.Province)
            .Include(x => x.District)
            .Include(x => x.SubDistrict)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล Location");

        return new LocationDto(
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
            l.IsActive);
    }
}
