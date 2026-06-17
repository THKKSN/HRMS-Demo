using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;

namespace Hrms.Infrastructure.Services;

public class OtpService(IDistributedCache cache) : IOtpService
{
    private static string CacheKey(string lineUserId) => $"otp:link:{lineUserId}";

    public async Task<string> GenerateAndStoreAsync(Guid employeeId, string lineUserId, CancellationToken ct = default)
    {
        var otpPlain = Random.Shared.Next(100_000, 999_999).ToString();
        var otpHash = HashOtp(otpPlain);

        var payload = JsonSerializer.Serialize(new OtpPayload(employeeId, otpHash));

        await cache.SetStringAsync(
            CacheKey(lineUserId),
            payload,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) },
            ct);

        return otpPlain;
    }

    public async Task<Guid?> ValidateAndConsumeAsync(string lineUserId, string otp, CancellationToken ct = default)
    {
        var key = CacheKey(lineUserId);
        var raw = await cache.GetStringAsync(key, ct);
        if (raw is null) return null;

        var payload = JsonSerializer.Deserialize<OtpPayload>(raw);
        if (payload is null) return null;

        var incoming = HashOtp(otp);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(incoming),
                Encoding.UTF8.GetBytes(payload.OtpHash)))
            return null;

        await cache.RemoveAsync(key, ct);
        return payload.EmployeeId;
    }

    private static string HashOtp(string otp)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(otp));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private record OtpPayload(Guid EmployeeId, string OtpHash);
}
