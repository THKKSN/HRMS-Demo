namespace Hrms.Domain.Enums;

/// <summary>
/// อัตราค่า OT ตามกฎหมายแรงงานไทย
/// </summary>
public enum OtRateType
{
    Weekday = 0,  // 1.5×
    Weekend = 1,  // 2×
    Holiday = 2,  // 3×
}
