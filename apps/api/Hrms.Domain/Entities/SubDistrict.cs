namespace Hrms.Domain.Entities;

public class SubDistrict
{
    public int SubDistrictId { get; set; }
    public string? SubDistrictCode { get; set; }
    public string? SubDistrictName { get; set; }
    public int? DistrictId { get; set; }
    public int? ProvinceId { get; set; }
    public int? GeoId { get; set; }

    public District? District { get; set; }
    public Province? Province { get; set; }
}
