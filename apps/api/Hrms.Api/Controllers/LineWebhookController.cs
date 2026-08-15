using Hrms.Application.Features.LineWebhook.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/line")]
public class LineWebhookController(
    IServiceScopeFactory scopeFactory,
    ILogger<LineWebhookController> logger) : ControllerBase
{
    private static readonly TimeSpan BodyReadTimeout = TimeSpan.FromMilliseconds(800);

    [HttpPost("webhook")]
    [DisableRateLimiting]
    public async Task<IActionResult> Webhook()
    {
        var body = await TryReadBodyBeforeAckAsync();
        if (body is null || body.Length == 0) return Ok();

        var signature = Request.Headers["X-Line-Signature"].FirstOrDefault() ?? string.Empty;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                await mediator.Send(new HandleLineWebhookCommand(body, signature), CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[Webhook] unhandled background processing error");
            }
        });

        // LINE กำหนดว่าต้อง return 200 เสมอ ไม่ว่าจะเกิดอะไรขึ้น
        return Ok();
    }

    private async Task<byte[]?> TryReadBodyBeforeAckAsync()
    {
        // ต้องอ่าน raw body ก่อนที่ model binder จะแตะ
        var buffer = new MemoryStream();
        var readTask = Request.Body.CopyToAsync(buffer);
        var completedTask = await Task.WhenAny(readTask, Task.Delay(BodyReadTimeout));

        if (completedTask != readTask)
        {
            _ = readTask.ContinueWith(task =>
            {
                buffer.Dispose();

                if (task.IsFaulted && task.Exception is not null)
                    logger.LogDebug(task.Exception, "[Webhook] delayed request body read failed after ack");
            }, TaskScheduler.Default);

            logger.LogWarning(
                "[Webhook] request body read did not complete within {TimeoutMs}ms; acknowledging without processing",
                BodyReadTimeout.TotalMilliseconds);
            return null;
        }

        try
        {
            await readTask;
            return buffer.ToArray();
        }
        catch (Exception ex) when (ex is OperationCanceledException or IOException)
        {
            logger.LogWarning(ex, "[Webhook] request body read was interrupted");
            return null;
        }
        finally
        {
            buffer.Dispose();
        }
    }
}
