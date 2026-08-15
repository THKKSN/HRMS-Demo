using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record UpsertTicketWorkflowStepRequest(string Key, string Label, int SortOrder, string? ActorType = null, string? Kind = null);
public record UpsertTicketWorkflowPresetRequest(string Key, string Label, string Kind, int SortOrder, bool IsActive = true);
public record UpsertTicketWorkflowActionRequest(string StepKey, string ActionKey, string ActionLabel, string ActorType, int SortOrder);

public record CreateTicketWorkflowDefinitionCommand(
    Guid CompanyId,
    Guid DepartmentId,
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    int? AutoAcknowledgeAfterDays,
    IReadOnlyList<UpsertTicketWorkflowStepRequest> Steps,
    IReadOnlyList<UpsertTicketWorkflowPresetRequest>? InProgressPresets,
    IReadOnlyList<UpsertTicketWorkflowActionRequest>? Actions) : IRequest<TicketWorkflowDefinitionDto>;

public record UpdateTicketWorkflowDefinitionCommand(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    int SortOrder,
    int? AutoAcknowledgeAfterDays,
    bool IsActive,
    IReadOnlyList<UpsertTicketWorkflowStepRequest> Steps,
    IReadOnlyList<UpsertTicketWorkflowPresetRequest>? InProgressPresets,
    IReadOnlyList<UpsertTicketWorkflowActionRequest>? Actions) : IRequest<TicketWorkflowDefinitionDto>;

public class CreateTicketWorkflowDefinitionValidator : AbstractValidator<CreateTicketWorkflowDefinitionCommand>
{
    public CreateTicketWorkflowDefinitionValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        RuleFor(x => x.AutoAcknowledgeAfterDays).GreaterThanOrEqualTo(1).When(x => x.AutoAcknowledgeAfterDays.HasValue);
        RuleFor(x => x.Steps).NotEmpty();
        RuleForEach(x => x.Steps).ChildRules(step =>
        {
            step.RuleFor(x => x.Key).NotEmpty().MaximumLength(100);
            step.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            step.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        });
        When(x => x.InProgressPresets is not null, () => RuleForEach(x => x.InProgressPresets!).ChildRules(item =>
        {
            item.RuleFor(x => x.Key).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.Kind).NotEmpty().MaximumLength(50);
            item.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        }));
        When(x => x.Actions is not null, () => RuleForEach(x => x.Actions!).ChildRules(item =>
        {
            item.RuleFor(x => x.StepKey).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.ActionKey).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.ActionLabel).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.ActorType).NotEmpty().MaximumLength(50);
            item.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        }));
    }
}

public class UpdateTicketWorkflowDefinitionValidator : AbstractValidator<UpdateTicketWorkflowDefinitionCommand>
{
    public UpdateTicketWorkflowDefinitionValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Code).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        RuleFor(x => x.AutoAcknowledgeAfterDays).GreaterThanOrEqualTo(1).When(x => x.AutoAcknowledgeAfterDays.HasValue);
        RuleFor(x => x.Steps).NotEmpty();
        RuleForEach(x => x.Steps).ChildRules(step =>
        {
            step.RuleFor(x => x.Key).NotEmpty().MaximumLength(100);
            step.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            step.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        });
        When(x => x.InProgressPresets is not null, () => RuleForEach(x => x.InProgressPresets!).ChildRules(item =>
        {
            item.RuleFor(x => x.Key).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.Kind).NotEmpty().MaximumLength(50);
            item.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        }));
        When(x => x.Actions is not null, () => RuleForEach(x => x.Actions!).ChildRules(item =>
        {
            item.RuleFor(x => x.StepKey).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.ActionKey).NotEmpty().MaximumLength(100);
            item.RuleFor(x => x.ActionLabel).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.ActorType).NotEmpty().MaximumLength(50);
            item.RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        }));
    }
}

public class CreateTicketWorkflowDefinitionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<CreateTicketWorkflowDefinitionCommand, TicketWorkflowDefinitionDto>
{
    public async Task<TicketWorkflowDefinitionDto> Handle(CreateTicketWorkflowDefinitionCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var code = request.Code.Trim();
        if (await db.TicketWorkflowDefinitions.AnyAsync(item =>
            item.CompanyId == request.CompanyId && item.DepartmentId == request.DepartmentId && item.Code == code, ct))
        {
            throw new ConflictException("DUPLICATE_TICKET_WORKFLOW_CODE", $"Workflow code '{code}' มีอยู่แล้ว");
        }

        var boardSteps = request.Steps
            .OrderBy(step => step.SortOrder)
            .Select(TicketWorkflowRuntime.NormalizeBoardStep)
            .ToList();
        var orderedSteps = TicketWorkflowRuntime.BuildLegacySteps(boardSteps);
        var presets = (request.InProgressPresets ?? [])
            .OrderBy(item => item.SortOrder)
            .Select(item => new TicketWorkflowInProgressPresetDto(
                item.Key.Trim(),
                item.Label.Trim(),
                item.Kind.Trim(),
                item.SortOrder,
                item.IsActive))
            .ToList();
        var actions = (request.Actions ?? [])
            .OrderBy(item => item.SortOrder)
            .Select(item => new TicketWorkflowActionDto(
                item.StepKey.Trim(),
                item.ActionKey.Trim(),
                item.ActionLabel.Trim(),
                item.ActorType.Trim(),
                item.SortOrder))
            .ToList();

        var entity = new TicketWorkflowDefinition
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            Code = code,
            Name = request.Name.Trim(),
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            AutoAcknowledgeAfterDays = request.AutoAcknowledgeAfterDays,
            BoardStepsJson = JsonSerializer.Serialize(boardSteps),
            InProgressPresetsJson = JsonSerializer.Serialize(presets),
            ActionsJson = JsonSerializer.Serialize(actions),
            StepsJson = JsonSerializer.Serialize(orderedSteps),
            StatusStepMapJson = JsonSerializer.Serialize(TicketWorkflowRuntime.BuildStatusStepMapFromBoard(boardSteps)),
            IsActive = true,
            CreatedBy = currentUser.EmployeeId,
            UpdatedBy = currentUser.EmployeeId,
        };

        db.TicketWorkflowDefinitions.Add(entity);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketWorkflowDefinition", entity.Id.ToString(), "create",
            $"สร้าง workflow '{entity.Name}'", null,
            new { entity.CompanyId, entity.DepartmentId, entity.Code, entity.Name, entity.SortOrder }, ct);

        return ToDto(entity);
    }

    internal static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    internal static TicketWorkflowDefinitionDto ToDto(TicketWorkflowDefinition entity)
        => new(
            entity.Id,
            entity.CompanyId,
            entity.DepartmentId,
            entity.Code,
            entity.Name,
            entity.Description,
            entity.SortOrder,
            entity.AutoAcknowledgeAfterDays,
            entity.IsActive,
            TicketWorkflowRuntime.DeserializeBoardSteps(entity.BoardStepsJson),
            TicketWorkflowRuntime.DeserializeInProgressPresets(entity.InProgressPresetsJson),
            TicketWorkflowRuntime.DeserializeActions(entity.ActionsJson),
            TicketWorkflowRuntime.DeserializeSteps(entity.StepsJson),
            TicketWorkflowRuntime.DeserializeStatusStepMap(entity.StatusStepMapJson));
}

public class UpdateTicketWorkflowDefinitionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketWorkflowDefinitionCommand, TicketWorkflowDefinitionDto>
{
    public async Task<TicketWorkflowDefinitionDto> Handle(UpdateTicketWorkflowDefinitionCommand request, CancellationToken ct)
    {
        var entity = await db.TicketWorkflowDefinitions.FirstOrDefaultAsync(item => item.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบ workflow ที่ระบุ");

        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", entity.CompanyId, entity.DepartmentId, ct);

        var code = request.Code.Trim();
        if (await db.TicketWorkflowDefinitions.AnyAsync(item =>
            item.CompanyId == entity.CompanyId
            && item.DepartmentId == entity.DepartmentId
            && item.Code == code
            && item.Id != entity.Id, ct))
        {
            throw new ConflictException("DUPLICATE_TICKET_WORKFLOW_CODE", $"Workflow code '{code}' มีอยู่แล้ว");
        }

        var boardSteps = request.Steps
            .OrderBy(step => step.SortOrder)
            .Select(TicketWorkflowRuntime.NormalizeBoardStep)
            .ToList();
        var orderedSteps = TicketWorkflowRuntime.BuildLegacySteps(boardSteps);
        var presets = (request.InProgressPresets ?? [])
            .OrderBy(item => item.SortOrder)
            .Select(item => new TicketWorkflowInProgressPresetDto(
                item.Key.Trim(),
                item.Label.Trim(),
                item.Kind.Trim(),
                item.SortOrder,
                item.IsActive))
            .ToList();
        var actions = (request.Actions ?? [])
            .OrderBy(item => item.SortOrder)
            .Select(item => new TicketWorkflowActionDto(
                item.StepKey.Trim(),
                item.ActionKey.Trim(),
                item.ActionLabel.Trim(),
                item.ActorType.Trim(),
                item.SortOrder))
            .ToList();

        entity.Code = code;
        entity.Name = request.Name.Trim();
        entity.Description = CreateTicketWorkflowDefinitionHandler.TrimOrNull(request.Description);
        entity.SortOrder = request.SortOrder;
        entity.AutoAcknowledgeAfterDays = request.AutoAcknowledgeAfterDays;
        entity.IsActive = request.IsActive;
        entity.BoardStepsJson = JsonSerializer.Serialize(boardSteps);
        entity.InProgressPresetsJson = JsonSerializer.Serialize(presets);
        entity.ActionsJson = JsonSerializer.Serialize(actions);
        entity.StepsJson = JsonSerializer.Serialize(orderedSteps);
        entity.StatusStepMapJson = JsonSerializer.Serialize(TicketWorkflowRuntime.BuildStatusStepMapFromBoard(boardSteps));
        entity.UpdatedBy = currentUser.EmployeeId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketWorkflowDefinition", entity.Id.ToString(), "update",
            $"อัปเดต workflow '{entity.Name}'", null,
            new { entity.Code, entity.Name, entity.SortOrder, entity.IsActive }, ct);

        return CreateTicketWorkflowDefinitionHandler.ToDto(entity);
    }
}

public record CreateTicketSubjectGuidanceConfigCommand(
    Guid CompanyId,
    Guid DepartmentId,
    Guid? CategoryId,
    Guid? TopicId,
    Guid? SubjectId,
    Guid? WorkflowDefinitionId,
    string Name,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    int Priority) : IRequest<TicketSubjectGuidanceConfigDto>;

public record UpdateTicketSubjectGuidanceConfigCommand(
    Guid Id,
    Guid? CategoryId,
    Guid? TopicId,
    Guid? SubjectId,
    Guid? WorkflowDefinitionId,
    string Name,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    int Priority,
    bool IsActive) : IRequest<TicketSubjectGuidanceConfigDto>;

public class CreateTicketSubjectGuidanceConfigValidator : AbstractValidator<CreateTicketSubjectGuidanceConfigCommand>
{
    public CreateTicketSubjectGuidanceConfigValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SuggestionTargetLabel).MaximumLength(100);
        RuleFor(x => x.Template).NotEmpty();
        RuleFor(x => x.Priority).InclusiveBetween(0, 9999);
        RuleForEach(x => x.Suggestions).ChildRules(item =>
        {
            item.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.Value).NotEmpty().MaximumLength(200);
        });
    }
}

public class UpdateTicketSubjectGuidanceConfigValidator : AbstractValidator<UpdateTicketSubjectGuidanceConfigCommand>
{
    public UpdateTicketSubjectGuidanceConfigValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SuggestionTargetLabel).MaximumLength(100);
        RuleFor(x => x.Template).NotEmpty();
        RuleFor(x => x.Priority).InclusiveBetween(0, 9999);
        RuleForEach(x => x.Suggestions).ChildRules(item =>
        {
            item.RuleFor(x => x.Label).NotEmpty().MaximumLength(200);
            item.RuleFor(x => x.Value).NotEmpty().MaximumLength(200);
        });
    }
}

public class CreateTicketSubjectGuidanceConfigHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<CreateTicketSubjectGuidanceConfigCommand, TicketSubjectGuidanceConfigDto>
{
    public async Task<TicketSubjectGuidanceConfigDto> Handle(CreateTicketSubjectGuidanceConfigCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        if (request.WorkflowDefinitionId.HasValue)
        {
            var workflowExists = await db.TicketWorkflowDefinitions.AnyAsync(item =>
                item.Id == request.WorkflowDefinitionId.Value
                && item.CompanyId == request.CompanyId
                && item.DepartmentId == request.DepartmentId, ct);
            if (!workflowExists) throw new KeyNotFoundException("ไม่พบ workflow ที่ระบุ");
        }

        var entity = new TicketSubjectGuidanceConfig
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            CategoryId = request.CategoryId,
            TopicId = request.TopicId,
            SubjectId = request.SubjectId,
            WorkflowDefinitionId = request.WorkflowDefinitionId,
            Name = request.Name.Trim(),
            SuggestionTargetLabel = CreateTicketWorkflowDefinitionHandler.TrimOrNull(request.SuggestionTargetLabel),
            SuggestionsJson = JsonSerializer.Serialize(request.Suggestions),
            Template = request.Template.Trim(),
            Priority = request.Priority,
            IsActive = true,
            CreatedBy = currentUser.EmployeeId,
            UpdatedBy = currentUser.EmployeeId,
        };

        db.TicketSubjectGuidanceConfigs.Add(entity);
        await db.SaveChangesAsync(ct);

        entity = await db.TicketSubjectGuidanceConfigs.AsNoTracking()
            .Include(item => item.WorkflowDefinition)
            .FirstAsync(item => item.Id == entity.Id, ct);

        await auditLog.LogAsync("ticket", "TicketSubjectGuidanceConfig", entity.Id.ToString(), "create",
            $"สร้าง guidance '{entity.Name}'", null, new { entity.Name, entity.Priority }, ct);

        return TicketWorkflowMasterQueryHelper.ToDto(entity);
    }
}

public class UpdateTicketSubjectGuidanceConfigHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketSubjectGuidanceConfigCommand, TicketSubjectGuidanceConfigDto>
{
    public async Task<TicketSubjectGuidanceConfigDto> Handle(UpdateTicketSubjectGuidanceConfigCommand request, CancellationToken ct)
    {
        var entity = await db.TicketSubjectGuidanceConfigs
            .Include(item => item.WorkflowDefinition)
            .FirstOrDefaultAsync(item => item.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบ guidance config ที่ระบุ");

        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", entity.CompanyId, entity.DepartmentId, ct);

        if (request.WorkflowDefinitionId.HasValue)
        {
            var workflowExists = await db.TicketWorkflowDefinitions.AnyAsync(item =>
                item.Id == request.WorkflowDefinitionId.Value
                && item.CompanyId == entity.CompanyId
                && item.DepartmentId == entity.DepartmentId, ct);
            if (!workflowExists) throw new KeyNotFoundException("ไม่พบ workflow ที่ระบุ");
        }

        entity.CategoryId = request.CategoryId;
        entity.TopicId = request.TopicId;
        entity.SubjectId = request.SubjectId;
        entity.WorkflowDefinitionId = request.WorkflowDefinitionId;
        entity.Name = request.Name.Trim();
        entity.SuggestionTargetLabel = CreateTicketWorkflowDefinitionHandler.TrimOrNull(request.SuggestionTargetLabel);
        entity.SuggestionsJson = JsonSerializer.Serialize(request.Suggestions);
        entity.Template = request.Template.Trim();
        entity.Priority = request.Priority;
        entity.IsActive = request.IsActive;
        entity.UpdatedBy = currentUser.EmployeeId;

        await db.SaveChangesAsync(ct);

        entity = await db.TicketSubjectGuidanceConfigs.AsNoTracking()
            .Include(item => item.WorkflowDefinition)
            .FirstAsync(item => item.Id == entity.Id, ct);

        await auditLog.LogAsync("ticket", "TicketSubjectGuidanceConfig", entity.Id.ToString(), "update",
            $"อัปเดต guidance '{entity.Name}'", null, new { entity.Name, entity.Priority, entity.IsActive }, ct);

        return TicketWorkflowMasterQueryHelper.ToDto(entity);
    }
}

internal static class TicketWorkflowMasterQueryHelper
{
    public static List<TicketWorkflowStepDto> DeserializeSteps(string json)
        => JsonSerializer.Deserialize<List<TicketWorkflowStepDto>>(json) ?? [];

    public static List<TicketGuidanceSuggestionDto> DeserializeSuggestions(string json)
        => JsonSerializer.Deserialize<List<TicketGuidanceSuggestionDto>>(json) ?? [];

    public static TicketSubjectGuidanceConfigDto ToDto(TicketSubjectGuidanceConfig entity)
        => new(
            entity.Id,
            entity.CompanyId,
            entity.DepartmentId,
            entity.CategoryId,
            entity.TopicId,
            entity.SubjectId,
            entity.WorkflowDefinitionId,
            entity.WorkflowDefinition?.Name,
            entity.Name,
            entity.SuggestionTargetLabel,
            DeserializeSuggestions(entity.SuggestionsJson),
            entity.Template,
            entity.Priority,
            entity.IsActive);
}
