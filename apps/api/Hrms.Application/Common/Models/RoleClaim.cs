namespace Hrms.Application.Common.Models;

public record RoleClaim(Guid RoleId, string Role, Guid? CompanyId, Guid? DepartmentId);
