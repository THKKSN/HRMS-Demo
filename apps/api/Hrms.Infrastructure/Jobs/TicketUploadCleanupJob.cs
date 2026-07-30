using Hrms.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Jobs;

public class TicketUploadCleanupJob(
    IApplicationDbContext db,
    IFileStorageService storage,
    ILogger<TicketUploadCleanupJob> logger)
{
    public async Task CleanupAsync(CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow.AddHours(7).AddHours(-24);
        var orphaned = await db.TicketPendingUploads
            .Where(upload => upload.LinkedAt == null && upload.CreatedAt < cutoff)
            .Take(200)
            .ToListAsync(ct);

        foreach (var upload in orphaned)
        {
            try
            {
                await storage.DeleteTicketAsync(upload.StorageKey, ct);
                db.TicketPendingUploads.Remove(upload);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to clean orphan ticket upload {UploadId}", upload.Id);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
