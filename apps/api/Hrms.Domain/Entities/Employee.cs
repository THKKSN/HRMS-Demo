using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Employee : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public Guid? RoleLabelId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? NationalId { get; set; }
    public string? LineUserId { get; set; }
    public string? PasswordHash { get; set; }
    public string? AvatarUrl { get; set; }
    public DateOnly? HireDate { get; set; }
    /// <summary>
    /// ภาษาล่าสุดที่ผู้ใช้ใช้งานหน้าจอ (header <c>X-Locale</c>) — มีไว้ให้ job ที่ทำงานนอก request
    /// รู้ว่าจะส่ง notification เป็นภาษาอะไร ดู docs/notification-i18n-plan.md ข้อ D9
    /// </summary>
    public string PreferredLanguage { get; set; } = "th";
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Department? Department { get; set; }
    public RoleLabel? RoleLabel { get; set; }
    public ICollection<EmployeeRole> Roles { get; set; } = new List<EmployeeRole>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<OtRequest> OtRequests { get; set; } = new List<OtRequest>();
    public ICollection<ExpenseClaim> ExpenseClaims { get; set; } = new List<ExpenseClaim>();
    public ICollection<EmployeeShiftOverride> ShiftOverrides { get; set; } = new List<EmployeeShiftOverride>();
}
