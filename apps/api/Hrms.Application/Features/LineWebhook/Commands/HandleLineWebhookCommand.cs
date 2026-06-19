using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LineWebhook.Dtos;
using MediatR;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record HandleLineWebhookCommand(string Body, string Signature) : IRequest<Unit>;

public class HandleLineWebhookHandler(
    ILineWebhookService webhookService,
    ISender sender)
    : IRequestHandler<HandleLineWebhookCommand, Unit>
{
    public async Task<Unit> Handle(HandleLineWebhookCommand request, CancellationToken ct)
    {
        if (!webhookService.VerifySignature(request.Body, request.Signature))
            return Unit.Value;

        LineWebhookPayload? payload;
        try { payload = JsonSerializer.Deserialize<LineWebhookPayload>(request.Body); }
        catch { return Unit.Value; }

        if (payload?.Events is null) return Unit.Value;

        foreach (var evt in payload.Events)
        {
            if (evt.Type != "postback") continue;
            if (evt.Source?.UserId is null) continue;
            if (evt.Postback?.Data is null) continue;

            var data = ParseQueryData(evt.Postback.Data);
            if (!data.TryGetValue("action", out var action) ||
                !data.TryGetValue("leaveId", out var leaveIdStr) ||
                !Guid.TryParse(leaveIdStr, out var leaveId))
                continue;

            await sender.Send(new ProcessLeaveWebhookCommand(leaveId, evt.Source.UserId, action), ct);
        }

        return Unit.Value;
    }

    private static Dictionary<string, string> ParseQueryData(string data) =>
        data.Split('&')
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(
                p => Uri.UnescapeDataString(p[0]),
                p => Uri.UnescapeDataString(p[1]));
}
