namespace Hrms.Application.Common.Interfaces;

public interface ILineMessagingService
{
    Task PushMessageAsync(string lineUserId, string message, CancellationToken ct = default);

    Task PushConfirmTemplateAsync(
        string lineUserId,
        string altText,
        string text,
        string confirmLabel,
        string confirmData,
        string rejectLabel,
        string rejectData,
        CancellationToken ct = default);
}
