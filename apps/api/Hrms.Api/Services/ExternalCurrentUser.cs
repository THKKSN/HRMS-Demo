using System.Security.Claims;
using Hrms.Application.Common.Interfaces;

namespace Hrms.Api.Services;

public sealed class ExternalCurrentUser(IHttpContextAccessor accessor) : IExternalCurrentUser
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public bool IsAuthenticated =>
        User?.Identity?.IsAuthenticated is true &&
        string.Equals(User.FindFirstValue("actor_type"), "external", StringComparison.Ordinal);

    public Guid? ExternalReporterId =>
        IsAuthenticated && Guid.TryParse(User?.FindFirstValue("external_reporter_id"), out var id)
            ? id
            : null;

    public string? LineUserId => IsAuthenticated ? User?.FindFirstValue("line_uid") : null;
}
