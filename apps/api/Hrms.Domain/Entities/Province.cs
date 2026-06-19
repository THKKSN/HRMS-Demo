namespace Hrms.Domain.Entities;

public class Province
{
    public int ProvinceId { get; set; }
    public string? ProvinceCode { get; set; }
    public string? ProvinceName { get; set; }
    public int? GeoId { get; set; }

    public ICollection<District> Districts { get; set; } = new List<District>();
}
