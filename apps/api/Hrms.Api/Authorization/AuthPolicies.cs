namespace Hrms.Api.Authorization;

public static class AuthPolicies
{
    public const string RequireHr         = "RequireHr";
    public const string RequireSupervisor = "RequireSupervisor";
    public const string RequireAdmin      = "RequireAdmin";
    public const string RequireExecutive  = "RequireExecutive";
}
