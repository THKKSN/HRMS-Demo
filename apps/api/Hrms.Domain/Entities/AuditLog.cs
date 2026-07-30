using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string Module { get; set; } = string.Empty;       // attendance, employee, permission
    public string EntityType { get; set; } = string.Empty;   // AttendanceRecord, Employee
    public string EntityId { get; set; } = string.Empty;     // UUID string
    public string Action { get; set; } = string.Empty;       // Create, Update
    public string Description { get; set; } = string.Empty;  // human-readable summary
    public string? OldValues { get; set; }                    // JSON snapshot before
    public string? NewValues { get; set; }                    // JSON snapshot after
    public Guid? PerformedByEmployeeId { get; set; }
    public string? PerformedByName { get; set; }
}
