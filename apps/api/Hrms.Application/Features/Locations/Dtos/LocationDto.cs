namespace Hrms.Application.Features.Locations.Dtos;

public record LocationDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    string? Address,
    int? ProvinceId,
    string? ProvinceName,
    int? DistrictId,
    string? DistrictName,
    int? SubDistrictId,
    string? SubDistrictName,
    bool IsActive);
