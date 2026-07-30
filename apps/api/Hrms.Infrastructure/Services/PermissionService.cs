using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Hrms.Infrastructure.Persistence;
using Hrms.Domain.Constants;
using Hrms.Domain.Enums;

namespace Hrms.Infrastructure.Services;

public class PermissionService(HrmsDbContext db, IDistributedCache cache) : IPermissionService
{
    private const string CachePrefix = "permissions:role:";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    public async Task<IReadOnlySet<string>> GetRolePermissionsAsync(
        string role, CancellationToken ct = default)
    {
        var cacheKey = $"{CachePrefix}{role}";

        var cached = await cache.GetStringAsync(cacheKey, ct);
        if (cached is not null)
            return JsonSerializer.Deserialize<HashSet<string>>(cached)!;

        if (!Enum.TryParse<RoleType>(role, ignoreCase: true, out var roleCode))
            return new HashSet<string>();

        var roleId = SystemRoleIds.FromCode(roleCode);
        var codes = await db.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.Permission.Code)
            .ToListAsync(ct);

        var set = codes.ToHashSet();

        await cache.SetStringAsync(
            cacheKey,
            JsonSerializer.Serialize(set),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheTtl },
            ct);

        return set;
    }

    public async Task<bool> HasPermissionAsync(
        ICurrentUser user, string permissionCode, CancellationToken ct = default)
    {
        // Admin มีทุก permission เสมอ
        if (user.Roles.Any(r => r.Role == "Admin"))
            return true;

        foreach (var roleClaim in user.Roles)
        {
            var perms = await GetRolePermissionsAsync(roleClaim.Role, ct);
            if (perms.Contains(permissionCode))
                return true;
        }
        return false;
    }

    public async Task InvalidateCacheAsync(string role)
    {
        await cache.RemoveAsync($"{CachePrefix}{role}");
    }
}
