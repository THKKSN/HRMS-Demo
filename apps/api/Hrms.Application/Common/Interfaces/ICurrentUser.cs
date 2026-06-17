using Hrms.Application.Common.Models;

namespace Hrms.Application.Common.Interfaces;

public interface ICurrentUser
{
    Guid? EmployeeId { get; }
    string? LineUserId { get; }
    Guid? CompanyId { get; }
    IReadOnlyList<RoleClaim> Roles { get; }
    bool IsAuthenticated { get; }
}
