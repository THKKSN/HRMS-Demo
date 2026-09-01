using Microsoft.AspNetCore.Authorization;

namespace Hrms.Api.Authorization;

/// <summary>
/// รองรับ [Authorize(Policy = "perm:{permissionCode}")] แบบ dynamic โดยไม่ต้อง
/// register policy ล่วงหน้าทีละ permission code — fallback ไปที่ DefaultPolicyProvider
/// สำหรับ policy อื่น (เช่น AuthPolicies.RequireHr, ExternalAuthDefaults.Policy)
/// </summary>
public class PermissionPolicyProvider(
    Microsoft.Extensions.Options.IOptions<AuthorizationOptions> options)
    : IAuthorizationPolicyProvider
{
    public const string Prefix = "perm:";

    private readonly DefaultAuthorizationPolicyProvider _fallback = new(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(Prefix, StringComparison.Ordinal))
        {
            var permissionCode = policyName[Prefix.Length..];
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(permissionCode))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return _fallback.GetPolicyAsync(policyName);
    }
}
