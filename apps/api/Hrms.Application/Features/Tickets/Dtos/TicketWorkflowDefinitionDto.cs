using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Tickets.Dtos;

public record TicketWorkflowBoardStepDto(
    string Key,
    string Label,
    string ActorType,
    string Kind,
    int SortOrder);

public record TicketWorkflowInProgressPresetDto(
    string Key,
    string Label,
    string Kind,
    int SortOrder,
    bool IsActive);

public record TicketWorkflowActionDto(
    string StepKey,
    string ActionKey,
    string ActionLabel,
    string ActorType,
    int SortOrder);

public record TicketWorkflowStepDto(
    string Key,
    string Label,
    int SortOrder);

public record TicketWorkflowDefinitionDto(
    Guid Id,
    Guid CompanyId,
    Guid DepartmentId,
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    int? AutoAcknowledgeAfterDays,
    bool IsActive,
    IReadOnlyList<TicketWorkflowBoardStepDto> BoardSteps,
    IReadOnlyList<TicketWorkflowInProgressPresetDto> InProgressPresets,
    IReadOnlyList<TicketWorkflowActionDto> Actions,
    IReadOnlyList<TicketWorkflowStepDto> Steps,
    IReadOnlyDictionary<TicketStatus, int> CurrentStepIndexByStatus);
