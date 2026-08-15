using System.Text.Json;
using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LineWebhook.Dtos;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineWebhookCommand(byte[] Body, string Signature) : IRequest<Unit>;

public class HandleLineWebhookHandler(
    ILineWebhookService webhookService,
    ILineMessagingService line,
    IDistributedCache cache,
    ISender sender,
    ILogger<HandleLineWebhookHandler> logger)
    : IRequestHandler<HandleLineWebhookCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineWebhookCommand request, CancellationToken ct)
    {
        logger.LogInformation("[Webhook] received body bytes={Length}", request.Body.Length);

        if (!webhookService.VerifySignature(request.Body, request.Signature))
        {
            logger.LogWarning("[Webhook] signature verification failed");
            return Unit.Value;
        }

        logger.LogInformation("[Webhook] signature OK");

        var bodyText = Encoding.UTF8.GetString(request.Body);

        LineWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<LineWebhookPayload>(bodyText);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "[Webhook] invalid JSON payload");
            return Unit.Value;
        }

        if (payload?.Events is null) return Unit.Value;

        foreach (var evt in payload.Events)
        {
            if (evt.Source?.UserId is null) continue;

            try
            {
                switch (evt.Type)
                {
                    case "message":
                        await HandleMessageEventAsync(evt, ct);
                        break;

                    case "postback":
                        await HandlePostbackEventAsync(evt, ct);
                        break;
                }
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogError(ex,
                    "[Webhook] event processing failed type={Type} userId={UserId}",
                    evt.Type,
                    evt.Source.UserId);
            }
        }

        return Unit.Value;
    }

    private async Task HandleMessageEventAsync(LineWebhookEvent evt, CancellationToken ct)
    {
        var lineUserId  = evt.Source!.UserId!;
        var replyToken  = evt.ReplyToken ?? string.Empty;
        var messageType = evt.Message?.Type;

        logger.LogInformation("[Webhook] message event type={Type} text={Text}", messageType, evt.Message?.Text);

        if (messageType == "location")
        {
            var lat = evt.Message?.Latitude;
            var lng = evt.Message?.Longitude;
            if (lat is null || lng is null) return;

            var cacheKey = $"line:pending:{lineUserId}";
            var pending  = await cache.GetStringAsync(cacheKey, ct);
            await cache.RemoveAsync(cacheKey, ct);

            switch (pending)
            {
                case "checkin":
                    await sender.Send(new HandleLineCheckInCommand(lineUserId, replyToken, lat.Value, lng.Value), ct);
                    break;
                case "checkout":
                    await sender.Send(new HandleLineCheckOutCommand(lineUserId, replyToken, lat.Value, lng.Value), ct);
                    break;
                default:
                    await line.ReplyAsync(replyToken, "กรุณากด 'ลงเวลา' ก่อนแชร์ตำแหน่ง", ct);
                    break;
            }
            return;
        }

        var text = evt.Message?.Text?.Trim();
        if (string.IsNullOrEmpty(text)) return;

        switch (text)
        {
            case "ระบบบริหารงานบุคคล":
            case "ระบบ HR":
            case "HRMS":
            case "TBG Assistant":
            case "เมนู":
            case "เมนูหลัก":
            case "สร้างบิล":
                await line.ReplyHrMenuAsync(replyToken, ct);
                break;

            case "ลงเวลา":
                await sender.Send(new HandleLineAttendancePromptCommand(lineUserId, replyToken), ct);
                break;

            case "ตรวจสอบสิทธิ์":
                logger.LogInformation("[Webhook] dispatching HandleCheckQuotaCommand userId={UserId}", lineUserId);
                await sender.Send(new HandleCheckQuotaCommand(lineUserId, replyToken), ct);
                break;

            default:
                logger.LogInformation("[Webhook] no handler for message text={Text}", text);
                break;
        }
    }

    private async Task HandlePostbackEventAsync(LineWebhookEvent evt, CancellationToken ct)
    {
        if (evt.Postback?.Data is null) return;

        var data = ParseQueryData(evt.Postback.Data);
        if (!data.TryGetValue("action", out var action)) return;

        switch (action)
        {
            case "approve" or "reject" when data.TryGetValue("leaveId", out var leaveIdStr)
                                         && Guid.TryParse(leaveIdStr, out var leaveId):
                await sender.Send(new ProcessLeaveWebhookCommand(leaveId, evt.Source!.UserId!, action), ct);
                break;
        }
    }

    private static Dictionary<string, string> ParseQueryData(string data) =>
        data.Split('&')
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(
                p => Uri.UnescapeDataString(p[0]),
                p => Uri.UnescapeDataString(p[1]));
}
