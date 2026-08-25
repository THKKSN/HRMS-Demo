using Hangfire;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Jobs;

[DisableConcurrentExecution(timeoutInSeconds: 300)]
public class ExternalRepairSyncDeliveryJob(
    HrmsDbContext db,
    IExternalRepairSyncClient client,
    ILogger<ExternalRepairSyncDeliveryJob> logger)
{
    private const int MaxAttempts = 5;
    private const int BatchSize = 50;

    public async Task ProcessAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var staleBefore = now.AddMinutes(-10);
        await db.ExternalRepairSyncOutboxes
            .Where(x => x.Status == NotificationDeliveryStatus.Processing &&
                x.ProcessingStartedAt < staleBefore)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, NotificationDeliveryStatus.Failed)
                .SetProperty(x => x.NextAttemptAt, now)
                .SetProperty(x => x.ProcessingStartedAt, (DateTime?)null)
                .SetProperty(x => x.LastError, "Recovered stale delivery lock"), ct);

        var ids = await db.ExternalRepairSyncOutboxes.AsNoTracking()
            .Where(x => (x.Status == NotificationDeliveryStatus.Pending ||
                    x.Status == NotificationDeliveryStatus.Failed) &&
                (!x.NextAttemptAt.HasValue || x.NextAttemptAt <= now))
            .OrderBy(x => x.CreatedAt)
            .Select(x => x.Id)
            .Take(BatchSize)
            .ToListAsync(ct);

        foreach (var id in ids)
        {
            ct.ThrowIfCancellationRequested();
            var claimed = await db.ExternalRepairSyncOutboxes
                .Where(x => x.Id == id &&
                    (x.Status == NotificationDeliveryStatus.Pending ||
                     x.Status == NotificationDeliveryStatus.Failed) &&
                    (!x.NextAttemptAt.HasValue || x.NextAttemptAt <= now))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, NotificationDeliveryStatus.Processing)
                    .SetProperty(x => x.ProcessingStartedAt, now), ct);
            if (claimed == 0) continue;

            var delivery = await db.ExternalRepairSyncOutboxes.FirstAsync(x => x.Id == id, ct);
            try
            {
                await client.SendAsync(delivery.PayloadJson, ct);
                delivery.Status = NotificationDeliveryStatus.Sent;
                delivery.SentAt = DateTime.UtcNow.AddHours(7);
                delivery.ProcessingStartedAt = null;
                delivery.NextAttemptAt = null;
                delivery.LastError = null;
                delivery.AttemptCount++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                delivery.AttemptCount++;
                delivery.ProcessingStartedAt = null;
                delivery.LastError = Truncate(ex.GetBaseException().Message, 2000);
                if (delivery.AttemptCount >= MaxAttempts)
                {
                    delivery.Status = NotificationDeliveryStatus.DeadLetter;
                    delivery.NextAttemptAt = null;
                    logger.LogError(ex,
                        "External repair sync {OutboxId} moved to dead letter", delivery.Id);
                }
                else
                {
                    delivery.Status = NotificationDeliveryStatus.Failed;
                    delivery.NextAttemptAt = DateTime.UtcNow.AddHours(7)
                        .AddMinutes(Math.Pow(2, delivery.AttemptCount - 1));
                    logger.LogWarning(ex,
                        "External repair sync {OutboxId} failed; retry scheduled", delivery.Id);
                }
            }
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}
