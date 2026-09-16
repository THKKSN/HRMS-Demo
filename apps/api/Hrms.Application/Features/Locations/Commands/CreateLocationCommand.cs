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
    string? Address,
    string? NameEn = null,
    string? NameId = null) : IRequest<LocationDto>;

public class CreateLocationValidator : AbstractValidator<CreateLocationCommand>
{
    public CreateLocationValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.RadiusMeters).InclusiveBetween(10, 5000);
        RuleFor(x => x.Address).MaximumLength(500).When(x => x.Address is not null);
    }
}

public class CreateLocationHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<CreateLocationCommand, LocationDto>
{
    public async Task<LocationDto> Handle(CreateLocationCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "company:manage-locations", ct);

        if (!currentUser.CanManageCompany(request.CompanyId))
            throw new AppForbiddenException("LOCATION_MANAGE_FORBIDDEN", "You are not allowed to manage locations in this company.");

        if (await db.Locations.AnyAsync(l => l.CompanyId == request.CompanyId && l.Name == request.Name, ct))
            throw new ConflictException("DUPLICATE_LOCATION", $"Location '{request.Name}' already exists in this company.");

        var location = new Location
        {
            CompanyId     = request.CompanyId,
            Name          = request.Name,
            NameEn        = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId        = Common.Helpers.NameText.Normalize(request.NameId),
            Latitude      = request.Latitude,
            Longitude     = request.Longitude,
            RadiusMeters  = request.RadiusMeters,
            ProvinceId    = request.ProvinceId,
            DistrictId    = request.DistrictId,
            SubDistrictId = request.SubDistrictId,
            Address       = request.Address,
            IsActive      = true,
            CreatedAt     = DateTime.UtcNow.AddHours(7),
            UpdatedAt     = DateTime.UtcNow.AddHours(7),
        };

        db.Locations.Add(location);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "location",
            entityType:  "Location",
            entityId:    location.Id.ToString(),
            action:      "create",
            description: $"สร้าง Location '{location.Name}' ใน company {location.CompanyId}",
            oldValues:   null,
            newValues:   new { location.Name, location.Latitude, location.Longitude, location.RadiusMeters, location.CompanyId },
            ct:          ct);

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
            location.IsActive,
            NameEn: location.NameEn,
            NameId: location.NameId);
    }
}
