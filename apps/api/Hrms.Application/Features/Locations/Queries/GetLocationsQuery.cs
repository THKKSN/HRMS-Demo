using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Locations.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Locations.Queries;

public record GetLocationsQuery(
    Guid? CompanyId,
    bool IncludeInactive = false) : IRequest<IReadOnlyList<LocationDto>>;

public class GetLocationsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetLocationsQuery, IReadOnlyList<LocationDto>>
{
    public async Task<IReadOnlyList<LocationDto>> Handle(GetLocationsQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้นที่เข้าถึงได้");

        var query = db.Locations
            .Include(l => l.Province)
            .Include(l => l.District)
            .Include(l => l.SubDistrict)
            .AsQueryable();

        if (!request.IncludeInactive)
            query = query.Where(l => l.IsActive);

        if (currentUser.HasRole(RoleType.Admin))
        {
            if (request.CompanyId.HasValue)
                query = query.Where(l => l.CompanyId == request.CompanyId.Value);
        }
        else
        {
            var managed = currentUser.ManagedCompanyIds.ToList();
            query = request.CompanyId.HasValue && managed.Contains(request.CompanyId.Value)
                ? query.Where(l => l.CompanyId == request.CompanyId.Value)
                : query.Where(l => managed.Contains(l.CompanyId));
        }

        var list = await query.OrderBy(l => l.Name).ToListAsync(ct);

        return list.Select(ToDto).ToList();
    }

    private static LocationDto ToDto(Domain.Entities.Location l) => new(
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
