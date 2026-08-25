using Hrms.Application.Common.Models;

namespace Hrms.Application.Common.Interfaces;

public interface ICurrentUser
{
    Guid? EmployeeId { get; }
    string? LineUserId { get; }
    Guid? CompanyId { get; }
    Guid? DepartmentId { get; }
    IReadOnlyList<RoleClaim> Roles { get; }
    IReadOnlyList<Guid> ManagedCompanyIds { get; }
    bool IsAuthenticated { get; }

    /// <summary>
    /// ชื่อแอปฝั่ง client ที่ยิง request นี้ (header X-Client-App) เช่น liff-web / admin-web
    /// เป็นข้อมูลเชิงสถิติ ไม่ใช้ตัดสินสิทธิ์ เพราะ client ปลอมค่าได้
    /// </summary>
    string? ClientApp { get; }
}
