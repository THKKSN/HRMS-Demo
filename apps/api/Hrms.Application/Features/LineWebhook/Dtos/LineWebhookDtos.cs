using System.Text.Json.Serialization;

namespace Hrms.Application.Features.LineWebhook.Dtos;

public record LineWebhookPayload(
    [property: JsonPropertyName("events")] List<LineWebhookEvent> Events);

public record LineWebhookEvent(
    [property: JsonPropertyName("type")]     string Type,
    [property: JsonPropertyName("source")]   LineWebhookSource? Source,
    [property: JsonPropertyName("postback")] LineWebhookPostback? Postback);

public record LineWebhookSource(
    [property: JsonPropertyName("type")]   string Type,
    [property: JsonPropertyName("userId")] string? UserId);

public record LineWebhookPostback(
    [property: JsonPropertyName("data")] string Data);
