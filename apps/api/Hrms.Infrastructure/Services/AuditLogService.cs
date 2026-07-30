using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public class AuditLogService(HrmsDbContext db, ICurrentUser currentUser) : IAuditLogService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = false };

    public async Task LogAsync(
        string module,
        string entityType,
        string entityId,
        string action,
        string description,
        object? oldValues = null,
        object? newValues = null,
        CancellationToken ct = default)
    {
        string? performedByName = null;
        if (currentUser.EmployeeId.HasValue)
        {
            var emp = await db.Employees
                .Where(e => e.Id == currentUser.EmployeeId.Value)
                .Select(e => new { e.FirstName, e.LastName })
                .FirstOrDefaultAsync(ct);
            if (emp is not null)
                performedByName = $"{emp.FirstName} {emp.LastName}".Trim();
        }

        var log = new AuditLog
        {
            Module                 = module,
            EntityType             = entityType,
            EntityId               = entityId,
            Action                 = action,
            Description            = description,
            OldValues              = oldValues is null ? null : JsonSerializer.Serialize(oldValues, JsonOpts),
            NewValues              = newValues is null ? null : JsonSerializer.Serialize(newValues, JsonOpts),
            PerformedByEmployeeId  = currentUser.EmployeeId,
            PerformedByName        = performedByName,
        };

        db.AuditLogs.Add(log);
        await db.SaveChangesAsync(ct);
    }
}
