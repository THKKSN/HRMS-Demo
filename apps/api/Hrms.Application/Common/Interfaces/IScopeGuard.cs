namespace Hrms.Application.Common.Interfaces;

public interface IScopeGuard
{
    Task<bool> CanAccessCompanyAsync(Guid companyId, CancellationToken ct = default);
    Task ThrowIfCannotAccessAsync(Guid companyId, CancellationToken ct = default);
}
