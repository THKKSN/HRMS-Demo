using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Domain.Constants;
using Hrms.Domain.Enums;

namespace Hrms.Application.Tests.Support;

internal sealed class TestCurrentUser(
    Guid employeeId,
    Guid companyId,
    Guid? departmentId,
    params RoleType[] roles) : ICurrentUser
{
    public Guid? EmployeeId { get; } = employeeId;
    public string? LineUserId => null;
    public Guid? CompanyId { get; } = companyId;
    public Guid? DepartmentId { get; } = departmentId;
    public IReadOnlyList<RoleClaim> Roles { get; } = roles
        .Select(role => new RoleClaim(SystemRoleIds.FromCode(role), role.ToString(), companyId, departmentId))
        .ToList();
    public IReadOnlyList<Guid> ManagedCompanyIds { get; } = [companyId];
    public bool IsAuthenticated => true;
    public string? ClientApp { get; set; }
}
