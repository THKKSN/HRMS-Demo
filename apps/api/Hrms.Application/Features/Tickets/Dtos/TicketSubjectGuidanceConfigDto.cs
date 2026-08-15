namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketGuidanceSuggestionDto(
    string Label,
    string Value);

public record TicketSubjectGuidanceConfigDto(
    Guid Id,
    Guid CompanyId,
    Guid DepartmentId,
    Guid? CategoryId,
    Guid? TopicId,
    Guid? SubjectId,
    Guid? WorkflowDefinitionId,
    string? WorkflowName,
    string Name,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    int Priority,
    bool IsActive);

public record TicketResolvedSubjectGuidanceDto(
    Guid? GuidanceConfigId,
    string? GuidanceConfigName,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string? Template,
    Guid? WorkflowDefinitionId,
    string? WorkflowName,
    int? WorkflowAutoAcknowledgeAfterDays,
    IReadOnlyList<TicketWorkflowStepDto> WorkflowSteps,
    IReadOnlyDictionary<Hrms.Domain.Enums.TicketStatus, int> WorkflowCurrentStepIndexByStatus);
