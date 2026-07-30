using Hrms.Application.Common.Interfaces;

namespace Hrms.Application.Tests.Support;

internal sealed class TestAuditLogService : IAuditLogService
{
    public Task LogAsync(
        string module,
        string entityType,
        string entityId,
        string action,
        string description,
        object? oldValues = null,
        object? newValues = null,
        CancellationToken ct = default)
        => Task.CompletedTask;
}
