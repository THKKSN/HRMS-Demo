using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;

namespace Hrms.Api.Services;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public Guid? EmployeeId =>
        Guid.TryParse(User?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;

    public string? LineUserId => User?.FindFirstValue("line_uid");

    public Guid? CompanyId =>
        Guid.TryParse(User?.FindFirstValue("company_id"), out var id) ? id : null;

    public IReadOnlyList<RoleClaim> Roles
    {
        get
        {
            var json = User?.FindFirstValue("roles");
            if (string.IsNullOrEmpty(json)) return [];
            return JsonSerializer.Deserialize<List<RoleClaim>>(json) ?? [];
        }
    }
}
