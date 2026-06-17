namespace Hrms.Application.Common.Models;

public record RoleClaim(string Role, Guid? CompanyId, Guid? DepartmentId);
