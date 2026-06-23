using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Hrms.Api.HealthChecks;

public sealed class RedisHealthCheck(IDistributedCache cache) : IHealthCheck
{
    private static readonly DistributedCacheEntryOptions _opts = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(10)
    };

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            await cache.SetStringAsync("_health_ping", "1", _opts, ct);
            await cache.GetStringAsync("_health_ping", ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis ไม่ตอบสนอง", ex);
        }
    }
}
