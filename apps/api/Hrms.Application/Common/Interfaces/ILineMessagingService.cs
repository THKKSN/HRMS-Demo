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

    Task PushFlexMessageAsync(string lineUserId, string altText, object flexContainer, CancellationToken ct = default);

    Task ReplyAsync(string replyToken, string message, CancellationToken ct = default);

    Task ReplyWithLocationRequestAsync(string replyToken, string promptText, CancellationToken ct = default);

    Task ReplyFlexMessageAsync(string replyToken, string altText, object flexContainer, CancellationToken ct = default);

    Task ReplyFlexWithLocationRequestAsync(string replyToken, string altText, object flexContainer, CancellationToken ct = default);
}
