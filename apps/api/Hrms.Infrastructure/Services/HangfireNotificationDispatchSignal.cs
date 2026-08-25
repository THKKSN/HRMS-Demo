using Hangfire;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Jobs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

public sealed class HangfireNotificationDispatchSignal(
    IServiceProvider serviceProvider,
    ILogger<HangfireNotificationDispatchSignal> logger) : INotificationDispatchSignal
{
    public void RequestDispatch()
    {
        try
        {
            // resolve แบบ lazy โดยตั้งใจ ห้าม inject IBackgroundJobClient เข้า constructor
            //
            // เหตุผล: HrmsDbContext พึ่ง service นี้ ถ้า constructor พึ่ง IBackgroundJobClient
            // การ resolve DbContext ทุกครั้งจะลาก JobStorage มาด้วย และ MySqlStorage
            // เปิด connection จริงตอนถูกสร้าง ผลคือ request ที่แค่อ่านข้อมูลจะพัง
            // ถ้า Hangfire storage มีปัญหา ซึ่งเป็นการขยายผลกระทบเกินความจำเป็น
            var jobClient = serviceProvider.GetRequiredService<IBackgroundJobClient>();
            jobClient.Enqueue<NotificationDeliveryJob>(job => job.ProcessAsync(CancellationToken.None));
        }
        catch (Exception ex)
        {
            // ห้ามให้การ enqueue ที่ล้มเหลวทำให้ request พัง เพราะข้อมูล commit ไปแล้ว
            // recurring job "notification-outbox-delivery" ยังเก็บกวาดให้อยู่
            logger.LogWarning(ex,
                "Failed to enqueue immediate notification dispatch; falling back to recurring job");
        }
    }
}
