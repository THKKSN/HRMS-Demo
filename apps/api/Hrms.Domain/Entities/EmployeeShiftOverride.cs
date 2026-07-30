using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class EmployeeShiftOverride : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Guid ShiftId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }   // null = ถาวร
    public string? Reason { get; set; }
    public Guid CreatedByHrId { get; set; }
    public bool IsActive { get; set; } = true;

    public Employee Employee { get; set; } = null!;
    public Shift Shift { get; set; } = null!;
    public Employee CreatedByHr { get; set; } = null!;
}
