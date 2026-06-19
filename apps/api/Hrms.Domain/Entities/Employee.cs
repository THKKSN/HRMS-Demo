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
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? NationalId { get; set; }
    public string? LineUserId { get; set; }
    public string? PasswordHash { get; set; }
    public string? AvatarUrl { get; set; }
    public DateOnly? HireDate { get; set; }
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Department? Department { get; set; }
    public RoleLabel? RoleLabel { get; set; }
    public ICollection<EmployeeRole> Roles { get; set; } = new List<EmployeeRole>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
}
