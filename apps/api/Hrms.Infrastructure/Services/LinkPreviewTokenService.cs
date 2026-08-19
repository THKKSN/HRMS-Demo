using System.Security.Cryptography;
using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// preview token = payload ที่เข้ารหัสด้วย Data Protection พร้อมวันหมดอายุในตัว
/// ไม่ต้องเก็บ state ใน DB หรือ Redis จึงไม่ต้องมี migration
/// </summary>
public sealed class LinkPreviewTokenService : ILinkPreviewTokenService
{
    /// <summary>
    /// purpose แยกเฉพาะงานนี้ — token จาก purpose อื่นจะ Unprotect ไม่ผ่าน
    /// ห้ามเปลี่ยนค่านี้โดยไม่ขึ้น version ใหม่ เพราะ token ที่ออกไปแล้วจะใช้ไม่ได้ทันที
    /// </summary>
    private const string Purpose = "Hrms.Auth.LineLinkPreview.v1";

    private readonly ITimeLimitedDataProtector _protector;
    private readonly TimeSpan _lifetime;

    public LinkPreviewTokenService(IDataProtectionProvider provider, TimeSpan lifetime)
    {
        _protector = provider.CreateProtector(Purpose).ToTimeLimitedDataProtector();
        _lifetime = lifetime;
    }

    public string Create(Guid employeeId, string lineUserId)
        => _protector.Protect(
            JsonSerializer.Serialize(new LinkPreviewIdentity(employeeId, lineUserId)),
            _lifetime);

    public LinkPreviewIdentity? Validate(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        try
        {
            return JsonSerializer.Deserialize<LinkPreviewIdentity>(_protector.Unprotect(token));
        }
        catch (Exception exception) when (
            exception is CryptographicException or JsonException or FormatException)
        {
            // token หมดอายุ ถูกแก้ไข หรือมาจาก purpose อื่น — ไม่ log ค่า token
            return null;
        }
    }
}
