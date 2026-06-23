namespace Hrms.Application.Common.Interfaces;

public interface IScopeGuard
{
    Task<bool> CanAccessCompanyAsync(Guid companyId, CancellationToken ct = default);
    Task ThrowIfCannotAccessAsync(Guid companyId, CancellationToken ct = default);

    /// <summary>
    /// null = เข้าได้ทุก company (Admin หรือ HQ HR)
    /// HashSet = เฉพาะ company IDs ที่เข้าได้
    /// </summary>
    Task<IReadOnlySet<Guid>?> GetAccessibleCompanyIdsAsync(CancellationToken ct = default);
}
