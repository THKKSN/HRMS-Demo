using Hangfire;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Jobs;

namespace Hrms.Infrastructure.Services;

public class HangfireLeaveNotificationService(IBackgroundJobClient jobClient) : ILeaveNotificationService
{
    public Task EnqueueApprovalPendingAsync(Guid leaveRequestId)
    {
        jobClient.Enqueue<LeaveNotificationJob>(j => j.SendApprovalPendingAsync(leaveRequestId));
        return Task.CompletedTask;
    }

    public Task EnqueueResultAsync(Guid leaveRequestId)
    {
        jobClient.Enqueue<LeaveNotificationJob>(j => j.SendResultAsync(leaveRequestId));
        return Task.CompletedTask;
    }
}
