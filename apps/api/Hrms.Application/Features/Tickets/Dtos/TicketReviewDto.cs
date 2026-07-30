using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketReviewDto(
    Guid Id,
    Guid TicketId,
    int ReviewRound,
    TicketReviewDecision Decision,
    string? ReviewNote,
    Guid ReviewedByEmployeeId,
    string ReviewedByEmployeeName,
    DateTime ReviewedAt,
    Guid? ResolvedByEmployeeId,
    string? ResolvedByEmployeeName,
    DateTime? ResolvedAt,
    TicketProblemType? ProblemTypeSnapshot,
    string? InitialInspectionSnapshot,
    string? ResolutionSnapshot,
    IReadOnlyList<Guid> ResolvedAttachmentIds);
