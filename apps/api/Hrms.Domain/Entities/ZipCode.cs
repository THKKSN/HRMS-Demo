namespace Hrms.Domain.Entities;

public class ZipCode
{
    public int? ZipcodeId { get; set; }
    public string? SubDistrictCode { get; set; }
    public int? ProvinceId { get; set; }
    public int? DistrictId { get; set; }
    public int? SubDistrictId { get; set; }
    public string? Zipcode { get; set; }
}
