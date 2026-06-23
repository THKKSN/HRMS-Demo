using System.Text.Json.Serialization;

namespace Hrms.Application.Features.LineWebhook.Dtos;

public record LineWebhookPayload(
    [property: JsonPropertyName("events")] List<LineWebhookEvent> Events);

public record LineWebhookEvent(
    [property: JsonPropertyName("type")]        string Type,
    [property: JsonPropertyName("replyToken")]  string? ReplyToken,
    [property: JsonPropertyName("source")]      LineWebhookSource? Source,
    [property: JsonPropertyName("postback")]    LineWebhookPostback? Postback,
    [property: JsonPropertyName("message")]     LineWebhookMessage? Message);

public record LineWebhookSource(
    [property: JsonPropertyName("type")]   string Type,
    [property: JsonPropertyName("userId")] string? UserId);

public record LineWebhookPostback(
    [property: JsonPropertyName("data")] string Data);

public record LineWebhookMessage(
    [property: JsonPropertyName("type")]      string  Type,
    [property: JsonPropertyName("text")]      string? Text,
    [property: JsonPropertyName("latitude")]  double? Latitude,
    [property: JsonPropertyName("longitude")] double? Longitude,
    [property: JsonPropertyName("address")]   string? Address);
