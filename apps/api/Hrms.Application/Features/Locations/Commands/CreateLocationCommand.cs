using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Locations.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Locations.Commands;

public record CreateLocationCommand(
    Guid CompanyId,
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address) : IRequest<LocationDto>;

public class CreateLocationValidator : AbstractValidator<CreateLocationCommand>
{
    public CreateLocationValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.RadiusMeters).InclusiveBetween(10, 5000);
        RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address is not null);
    }
}

public class CreateLocationHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CreateLocationCommand, LocationDto>
{
    public async Task<LocationDto> Handle(CreateLocationCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้นที่สร้าง Location ได้");

        if (!currentUser.CanManageCompany(request.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการ Location ใน company นี้");

        if (await db.Locations.AnyAsync(l => l.CompanyId == request.CompanyId && l.Name == request.Name, ct))
            throw new ConflictException("DUPLICATE_LOCATION", $"ชื่อ Location '{request.Name}' มีอยู่แล้วใน company นี้");

        var location = new Location
        {
            CompanyId     = request.CompanyId,
            Name          = request.Name,
            Latitude      = request.Latitude,
            Longitude     = request.Longitude,
            RadiusMeters  = request.RadiusMeters,
            ProvinceId    = request.ProvinceId,
            DistrictId    = request.DistrictId,
            SubDistrictId = request.SubDistrictId,
            Address       = request.Address,
            IsActive      = true,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
        };

        db.Locations.Add(location);
        await db.SaveChangesAsync(ct);

        // reload navigations for response
        await db.Locations.Entry(location)
            .Reference(l => l.Province).LoadAsync(ct);
        await db.Locations.Entry(location)
            .Reference(l => l.District).LoadAsync(ct);
        await db.Locations.Entry(location)
            .Reference(l => l.SubDistrict).LoadAsync(ct);

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
