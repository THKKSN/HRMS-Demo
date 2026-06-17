namespace Hrms.Application.Common.Interfaces;

public interface ILineMessagingService
{
    Task PushMessageAsync(string lineUserId, string message, CancellationToken ct = default);
}
