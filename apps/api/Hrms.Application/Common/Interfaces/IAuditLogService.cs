namespace Hrms.Application.Common.Interfaces;

public interface IAuditLogService
{
    Task LogAsync(
        string module,
        string entityType,
        string entityId,
        string action,
        string description,
        object? oldValues = null,
        object? newValues = null,
        CancellationToken ct = default);
}
