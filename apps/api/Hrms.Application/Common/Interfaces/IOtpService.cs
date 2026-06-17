namespace Hrms.Application.Common.Interfaces;

public interface IOtpService
{
    /// <summary>สร้าง OTP 6 หลัก, เก็บ hash ใน Redis TTL 5 นาที, คืน OTP ดิบ</summary>
    Task<string> GenerateAndStoreAsync(Guid employeeId, string lineUserId, CancellationToken ct = default);

    /// <summary>ตรวจ OTP จาก Redis — ถ้าถูกให้คืน employeeId และลบ key ทิ้ง (one-time use)</summary>
    Task<Guid?> ValidateAndConsumeAsync(string lineUserId, string otp, CancellationToken ct = default);
}
