using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

internal sealed record ResolvedTicketWorkflow(
    Guid WorkflowDefinitionId,
    string Name,
    int? AutoAcknowledgeAfterDays,
    IReadOnlyList<TicketWorkflowBoardStepDto> BoardSteps,
    IReadOnlyList<TicketWorkflowInProgressPresetDto> InProgressPresets,
    IReadOnlyList<TicketWorkflowActionDto> Actions,
    IReadOnlyList<TicketWorkflowStepDto> Steps,
    IReadOnlyDictionary<TicketStatus, int> CurrentStepIndexByStatus);

internal sealed record ResolvedTicketGuidance(
    Guid GuidanceConfigId,
    string GuidanceConfigName,
    string? SuggestionTargetLabel,
    IReadOnlyList<TicketGuidanceSuggestionDto> Suggestions,
    string Template,
    ResolvedTicketWorkflow? Workflow);

internal static class TicketWorkflowRuntime
{
    public static List<TicketWorkflowBoardStepDto> DeserializeBoardSteps(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<TicketWorkflowBoardStepDto>>(json) ?? [];

    public static List<TicketWorkflowInProgressPresetDto> DeserializeInProgressPresets(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<TicketWorkflowInProgressPresetDto>>(json) ?? [];

    public static List<TicketWorkflowActionDto> DeserializeActions(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<TicketWorkflowActionDto>>(json) ?? [];

    public static List<TicketWorkflowStepDto> DeserializeSteps(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<TicketWorkflowStepDto>>(json) ?? [];

    public static List<TicketGuidanceSuggestionDto> DeserializeSuggestions(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<List<TicketGuidanceSuggestionDto>>(json) ?? [];

    public static Dictionary<TicketStatus, int> DeserializeStatusStepMap(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? []
            : JsonSerializer.Deserialize<Dictionary<TicketStatus, int>>(json) ?? [];

    public static Dictionary<TicketStatus, int> BuildStatusStepMap(IReadOnlyList<TicketWorkflowStepDto> steps)
    {
        var map = new Dictionary<TicketStatus, int>();
        if (steps.Count == 0) return map;

        map[TicketStatus.Open] = 0;
        map[TicketStatus.Rejected] = 0;
        map[TicketStatus.Cancelled] = 0;

        for (var index = 0; index < steps.Count; index++)
        {
            var normalized = Normalize(steps[index].Label);
            if (!map.ContainsKey(TicketStatus.Assigned) &&
                (normalized.Contains("รับเรื่อง") || normalized.Contains("จ่ายงาน") || normalized.Contains("มอบหมาย")))
                map[TicketStatus.Assigned] = index;

            if (!map.ContainsKey(TicketStatus.InProgress) &&
                (normalized.Contains("เริ่มทำงาน") || normalized.Contains("กำลังทำ") || normalized.Contains("ทำงาน")))
                map[TicketStatus.InProgress] = index;

            if (!map.ContainsKey(TicketStatus.WaitingInfo) &&
                (normalized.Contains("รอข้อมูล") || normalized.Contains("รอผู้แจ้ง") || normalized.Contains("ขอข้อมูล")))
                map[TicketStatus.WaitingInfo] = index;

            if (!map.ContainsKey(TicketStatus.Resolved) &&
                (normalized.Contains("รอตรวจ") || normalized.Contains("ตรวจจบ") || normalized.Contains("ตรวจรับ") || normalized.Contains("จบงาน")))
                map[TicketStatus.Resolved] = index;

            if (!map.ContainsKey(TicketStatus.Closed) &&
                (normalized.Contains("รับทราบ") || normalized.Contains("ปิดงาน") || normalized.Contains("เสร็จสิ้น") || normalized.Contains("เรียบร้อย")))
                map[TicketStatus.Closed] = index;
        }

        if (!map.ContainsKey(TicketStatus.Assigned) && steps.Count > 1) map[TicketStatus.Assigned] = 1;
        if (!map.ContainsKey(TicketStatus.InProgress) && steps.Count > 2) map[TicketStatus.InProgress] = 2;
        if (!map.ContainsKey(TicketStatus.WaitingInfo)) map[TicketStatus.WaitingInfo] = map.GetValueOrDefault(TicketStatus.InProgress, Math.Min(steps.Count - 1, 2));
        if (!map.ContainsKey(TicketStatus.Resolved)) map[TicketStatus.Resolved] = Math.Max(steps.Count - 2, 0);
        if (!map.ContainsKey(TicketStatus.Closed)) map[TicketStatus.Closed] = steps.Count - 1;

        return map;
    }

    public static List<TicketWorkflowStepDto> BuildLegacySteps(IReadOnlyList<TicketWorkflowBoardStepDto> boardSteps)
        => boardSteps
            .OrderBy(step => step.SortOrder)
            .Select(step => new TicketWorkflowStepDto(step.Key, step.Label, step.SortOrder))
            .ToList();

    public static Dictionary<TicketStatus, int> BuildStatusStepMapFromBoard(IReadOnlyList<TicketWorkflowBoardStepDto> boardSteps)
    {
        var ordered = boardSteps.OrderBy(step => step.SortOrder).ToList();
        if (ordered.Count == 0) return [];

        var map = new Dictionary<TicketStatus, int>
        {
            [TicketStatus.Open] = 0,
            [TicketStatus.Rejected] = 0,
            [TicketStatus.Cancelled] = 0,
        };

        var assignedIndex = ordered.FindIndex(step => step.Key is "received" or "assigned");
        if (assignedIndex < 0) assignedIndex = Math.Min(1, ordered.Count - 1);
        map[TicketStatus.Assigned] = assignedIndex;

        var inProgressIndex = ordered.FindIndex(step => step.Key == "in_progress" || step.Kind == "working");
        if (inProgressIndex < 0) inProgressIndex = Math.Min(2, ordered.Count - 1);
        map[TicketStatus.InProgress] = inProgressIndex;
        map[TicketStatus.WaitingInfo] = inProgressIndex;

        var resolvedIndex = ordered.FindIndex(step => step.Key == "completed_review" || step.Kind == "review");
        if (resolvedIndex < 0) resolvedIndex = Math.Max(ordered.Count - 2, 0);
        map[TicketStatus.Resolved] = resolvedIndex;

        var closedIndex = ordered.FindIndex(step => step.Key == "accepted" || step.Kind == "end");
        if (closedIndex < 0) closedIndex = ordered.Count - 1;
        map[TicketStatus.Closed] = closedIndex;

        return map;
    }

    public static TicketWorkflowBoardStepDto NormalizeBoardStep(UpsertTicketWorkflowStepRequest step)
        => new(
            step.Key.Trim(),
            step.Label.Trim(),
            string.IsNullOrWhiteSpace(step.ActorType) ? InferActorType(step.Key, step.SortOrder) : step.ActorType.Trim(),
            string.IsNullOrWhiteSpace(step.Kind) ? InferKind(step.Key, step.SortOrder) : step.Kind.Trim(),
            step.SortOrder);

    private static string InferActorType(string key, int sortOrder)
    {
        var normalized = key.Trim().ToLowerInvariant();
        if (sortOrder == 10 || normalized is "submitted") return "requester";
        if (normalized is "received" or "assigned" or "completed_review") return "supervisor";
        if (normalized is "accepted") return "requester";
        return "assignee";
    }

    private static string InferKind(string key, int sortOrder)
    {
        var normalized = key.Trim().ToLowerInvariant();
        if (sortOrder == 10 || normalized is "submitted") return "start";
        if (normalized is "in_progress") return "working";
        if (normalized is "completed_review") return "review";
        if (normalized is "accepted") return "end";
        return "queue";
    }

    public static async Task<ResolvedTicketGuidance?> ResolveGuidanceAsync(
        IApplicationDbContext db,
        Guid companyId,
        Guid departmentId,
        Guid categoryId,
        Guid topicId,
        Guid subjectId,
        CancellationToken ct)
    {
        var items = await db.TicketSubjectGuidanceConfigs
            .AsNoTracking()
            .Where(item =>
                item.IsActive &&
                item.CompanyId == companyId &&
                item.DepartmentId == departmentId &&
                (!item.CategoryId.HasValue || item.CategoryId == categoryId) &&
                (!item.TopicId.HasValue || item.TopicId == topicId) &&
                (!item.SubjectId.HasValue || item.SubjectId == subjectId))
            .Include(item => item.WorkflowDefinition)
            .ToListAsync(ct);

        var matched = items
            .OrderByDescending(item => item.SubjectId.HasValue)
            .ThenByDescending(item => item.TopicId.HasValue)
            .ThenByDescending(item => item.CategoryId.HasValue)
            .ThenBy(item => item.Priority)
            .ThenBy(item => item.Name)
            .FirstOrDefault();

        if (matched is null) return null;

        ResolvedTicketWorkflow? workflow = null;
        if (matched.WorkflowDefinition is { IsActive: true } workflowEntity)
        {
            var boardSteps = DeserializeBoardSteps(workflowEntity.BoardStepsJson);
            var steps = boardSteps.Count > 0
                ? BuildLegacySteps(boardSteps)
                : DeserializeSteps(workflowEntity.StepsJson);
            workflow = new ResolvedTicketWorkflow(
                workflowEntity.Id,
                workflowEntity.Name,
                workflowEntity.AutoAcknowledgeAfterDays,
                boardSteps,
                DeserializeInProgressPresets(workflowEntity.InProgressPresetsJson),
                DeserializeActions(workflowEntity.ActionsJson),
                steps,
                boardSteps.Count > 0
                    ? BuildStatusStepMapFromBoard(boardSteps)
                    : DeserializeStatusStepMap(workflowEntity.StatusStepMapJson));
        }

        return new ResolvedTicketGuidance(
            matched.Id,
            matched.Name,
            matched.SuggestionTargetLabel,
            DeserializeSuggestions(matched.SuggestionsJson),
            matched.Template,
            workflow);
    }

    private static string Normalize(string value)
        => value.Replace(" ", string.Empty).Trim();
}
