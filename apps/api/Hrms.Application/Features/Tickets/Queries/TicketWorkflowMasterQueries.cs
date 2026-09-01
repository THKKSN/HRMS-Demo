using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketWorkflowDefinitionsQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<TicketWorkflowDefinitionDto>>;

public class GetTicketWorkflowDefinitionsHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetTicketWorkflowDefinitionsQuery, IReadOnlyList<TicketWorkflowDefinitionDto>>
{
    public async Task<IReadOnlyList<TicketWorkflowDefinitionDto>> Handle(GetTicketWorkflowDefinitionsQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        return await db.TicketWorkflowDefinitions.AsNoTracking()
            .Where(item => item.CompanyId == request.CompanyId && item.DepartmentId == request.DepartmentId)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Name)
            .Select(item => new TicketWorkflowDefinitionDto(
                item.Id,
                item.CompanyId,
                item.DepartmentId,
                item.Code,
                item.Name,
                item.Description,
                item.SortOrder,
                item.AutoAcknowledgeAfterDays,
                item.IsActive,
                TicketWorkflowRuntime.DeserializeBoardSteps(item.BoardStepsJson),
                TicketWorkflowRuntime.DeserializeInProgressPresets(item.InProgressPresetsJson),
                TicketWorkflowRuntime.DeserializeActions(item.ActionsJson),
                TicketWorkflowRuntime.DeserializeSteps(item.StepsJson),
                TicketWorkflowRuntime.DeserializeStatusStepMap(item.StatusStepMapJson)))
            .ToListAsync(ct);
    }
}

public record GetTicketSubjectGuidanceConfigsQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<TicketSubjectGuidanceConfigDto>>;

public class GetTicketSubjectGuidanceConfigsHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetTicketSubjectGuidanceConfigsQuery, IReadOnlyList<TicketSubjectGuidanceConfigDto>>
{
    public async Task<IReadOnlyList<TicketSubjectGuidanceConfigDto>> Handle(GetTicketSubjectGuidanceConfigsQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var items = await db.TicketSubjectGuidanceConfigs.AsNoTracking()
            .Where(item => item.CompanyId == request.CompanyId && item.DepartmentId == request.DepartmentId)
            .Include(item => item.WorkflowDefinition)
            .OrderBy(item => item.Priority)
            .ThenBy(item => item.Name)
            .ToListAsync(ct);

        return items.Select(item => new TicketSubjectGuidanceConfigDto(
            item.Id,
            item.CompanyId,
            item.DepartmentId,
            item.CategoryId,
            item.TopicId,
            item.SubjectId,
            item.WorkflowDefinitionId,
            item.WorkflowDefinition?.Name,
            item.Name,
            item.SuggestionTargetLabel,
            TicketWorkflowRuntime.DeserializeSuggestions(item.SuggestionsJson),
            item.Template,
            item.Priority,
            item.IsActive)).ToList();
    }
}

public record ResolveTicketSubjectGuidanceQuery(
    Guid CompanyId,
    Guid DepartmentId,
    Guid CategoryId,
    Guid TopicId,
    Guid SubjectId) : IRequest<TicketResolvedSubjectGuidanceDto?>;

public class ResolveTicketSubjectGuidanceHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<ResolveTicketSubjectGuidanceQuery, TicketResolvedSubjectGuidanceDto?>
{
    public async Task<TicketResolvedSubjectGuidanceDto?> Handle(ResolveTicketSubjectGuidanceQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissionService, "ticket:create", ct);

        var guidance = await TicketWorkflowRuntime.ResolveGuidanceAsync(
            db,
            request.CompanyId,
            request.DepartmentId,
            request.CategoryId,
            request.TopicId,
            request.SubjectId,
            ct);

        if (guidance is null) return null;

        return new TicketResolvedSubjectGuidanceDto(
            guidance.GuidanceConfigId,
            guidance.GuidanceConfigName,
            guidance.SuggestionTargetLabel,
            guidance.Suggestions,
            guidance.Template,
            guidance.Workflow?.WorkflowDefinitionId,
            guidance.Workflow?.Name,
            guidance.Workflow?.AutoAcknowledgeAfterDays,
            guidance.Workflow?.Steps ?? [],
            guidance.Workflow?.CurrentStepIndexByStatus ?? new Dictionary<Hrms.Domain.Enums.TicketStatus, int>());
    }
}
