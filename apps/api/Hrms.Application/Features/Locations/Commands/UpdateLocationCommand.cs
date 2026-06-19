using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Locations.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Locations.Commands;

public record UpdateLocationCommand(
    Guid Id,
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address,
    bool IsActive) : IRequest<LocationDto>;

public class UpdateLocationValidator : AbstractValidator<UpdateLocationCommand>
{
    public UpdateLocationValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.RadiusMeters).InclusiveBetween(10, 5000);
        RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address is not null);
    }
}

public class UpdateLocationHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateLocationCommand, LocationDto>
{
    public async Task<LocationDto> Handle(UpdateLocationCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้นที่แก้ไข Location ได้");

        var location = await db.Locations
            .Include(l => l.Province)
            .Include(l => l.District)
            .Include(l => l.SubDistrict)
            .FirstOrDefaultAsync(l => l.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล Location");

        if (!currentUser.CanManageCompany(location.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการ Location ใน company นี้");

        if (await db.Locations.AnyAsync(
            l => l.CompanyId == location.CompanyId && l.Name == request.Name && l.Id != location.Id, ct))
            throw new ConflictException("DUPLICATE_LOCATION", $"ชื่อ Location '{request.Name}' มีอยู่แล้วใน company นี้");

        location.Name          = request.Name;
        location.Latitude      = request.Latitude;
        location.Longitude     = request.Longitude;
        location.RadiusMeters  = request.RadiusMeters;
        location.ProvinceId    = request.ProvinceId;
        location.DistrictId    = request.DistrictId;
        location.SubDistrictId = request.SubDistrictId;
        location.Address       = request.Address;
        location.IsActive      = request.IsActive;
        location.UpdatedAt     = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        // reload navigations if address changed
        if (request.ProvinceId != location.Province?.ProvinceId)
            await db.Locations.Entry(location).Reference(l => l.Province).LoadAsync(ct);
        if (request.DistrictId != location.District?.DistrictId)
            await db.Locations.Entry(location).Reference(l => l.District).LoadAsync(ct);
        if (request.SubDistrictId != location.SubDistrict?.SubDistrictId)
            await db.Locations.Entry(location).Reference(l => l.SubDistrict).LoadAsync(ct);

        return new LocationDto(
            location.Id,
            location.CompanyId,
            location.Name,
            location.Latitude,
            location.Longitude,
            location.RadiusMeters,
            location.Address,
            location.ProvinceId,
            location.Province?.ProvinceName,
            location.DistrictId,
            location.District?.DistrictName,
            location.SubDistrictId,
            location.SubDistrict?.SubDistrictName,
            location.IsActive);
    }
}
