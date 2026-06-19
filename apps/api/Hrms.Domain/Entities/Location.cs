using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Location : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int RadiusMeters { get; set; }
    public int? ProvinceId { get; set; }
    public int? DistrictId { get; set; }
    public int? SubDistrictId { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Province? Province { get; set; }
    public District? District { get; set; }
    public SubDistrict? SubDistrict { get; set; }
}
