namespace Hrms.Domain.Entities;

public class District
{
    public int DistrictId { get; set; }
    public string? DistrictCode { get; set; }
    public string? DistrictName { get; set; }
    public int? GeoId { get; set; }
    public int? ProvinceId { get; set; }

    public Province? Province { get; set; }
    public ICollection<SubDistrict> SubDistricts { get; set; } = new List<SubDistrict>();
}
