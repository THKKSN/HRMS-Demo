namespace Hrms.Application.Features.Address.Dtos;

public record ProvinceDto(int ProvinceId, string? ProvinceName);

public record DistrictDto(int DistrictId, string? DistrictName, int? ProvinceId);

public record SubDistrictDto(int SubDistrictId, string? SubDistrictName, int? DistrictId, int? ProvinceId);

public record ZipCodeDto(int? SubDistrictId, string? Zipcode);
