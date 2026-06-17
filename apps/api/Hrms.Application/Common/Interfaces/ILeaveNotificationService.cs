namespace Hrms.Application.Common.Interfaces;

public interface ILeaveNotificationService
{
    Task EnqueueApprovalPendingAsync(Guid leaveRequestId);
    Task EnqueueResultAsync(Guid leaveRequestId);
}
