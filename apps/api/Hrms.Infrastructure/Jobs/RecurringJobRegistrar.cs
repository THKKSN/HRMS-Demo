using Hangfire;

namespace Hrms.Infrastructure.Jobs;

public sealed class RecurringJobRegistrar(IRecurringJobManager recurringJobs)
{
    public void RegisterDevelopmentJobs()
    {
        recurringJobs.AddOrUpdate<DailyAttendanceReportJob>(
            "daily-attendance-report",
            job => job.SendDailyReportAsync(CancellationToken.None),
            "0 3 * * 1-5",
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
    }

    public void RegisterProductionJobs()
    {
        recurringJobs.AddOrUpdate<TicketUploadCleanupJob>(
            "ticket-upload-cleanup",
            job => job.CleanupAsync(CancellationToken.None),
            "15 * * * *",
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
        recurringJobs.AddOrUpdate<NotificationDeliveryJob>(
            "notification-outbox-delivery",
            job => job.ProcessAsync(CancellationToken.None),
            Cron.Minutely);
        recurringJobs.AddOrUpdate<ExternalRepairSyncDeliveryJob>(
            "external-repair-sync-delivery",
            job => job.ProcessAsync(CancellationToken.None),
            Cron.Minutely);
        recurringJobs.AddOrUpdate<ExpenseOcrJob>(
            "expense-ocr-stale-recovery",
            job => job.RecoverStaleProcessingAsync(CancellationToken.None),
            "*/5 * * * *",
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
        recurringJobs.AddOrUpdate<TicketAutoConfirmationJob>(
            "ticket-auto-requester-confirmation",
            job => job.RunAsync(CancellationToken.None),
            "0 0 * * *",
            new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
    }
}
