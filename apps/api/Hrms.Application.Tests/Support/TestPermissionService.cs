using Hrms.Application.Common.Interfaces;

namespace Hrms.Application.Tests.Support;

internal sealed class TestPermissionService(params string[] granted) : IPermissionService
{
    private readonly HashSet<string> _granted = granted.ToHashSet(StringComparer.Ordinal);

    public Task<IReadOnlySet<string>> GetRolePermissionsAsync(
        string role, CancellationToken ct = default)
        => Task.FromResult<IReadOnlySet<string>>(_granted);

    public Task<bool> HasPermissionAsync(
        ICurrentUser user, string permissionCode, CancellationToken ct = default)
        => Task.FromResult(_granted.Contains(permissionCode));

    public Task InvalidateCacheAsync(string role) => Task.CompletedTask;
}
