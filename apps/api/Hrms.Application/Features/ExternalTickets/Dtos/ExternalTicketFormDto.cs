namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketFormDto(
    bool IsEnabled,
    bool RequireOaFriendship,
    IReadOnlyList<ExternalTicketFormCategoryDto> Categories);

public record ExternalTicketFormCategoryDto(
    Guid Id,
    string Name,
    string? Description,
    IReadOnlyList<ExternalTicketFormTopicDto> Topics);

public record ExternalTicketFormTopicDto(
    Guid Id,
    string Name,
    string? Description,
    IReadOnlyList<ExternalTicketFormSubjectDto> Subjects);

// ห้ามคืน internal taxonomy identifier หรือ mapping ไปยังฝั่งใน — ตามที่ระบุไว้ใน spec
public record ExternalTicketFormSubjectDto(
    Guid Id,
    string Name,
    string? Description,
    string? Template,
    IReadOnlyList<string> Suggestions);
