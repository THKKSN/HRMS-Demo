using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Commands;

public record CreateExternalTicketSubjectCommand(
    Guid ExternalTicketTopicId, string Name, string? Description,
    string? Template, IReadOnlyList<string>? Suggestions, int SortOrder)
    : IRequest<ExternalTicketSubjectDto>;

public class CreateExternalTicketSubjectValidator : AbstractValidator<CreateExternalTicketSubjectCommand>
{
    public CreateExternalTicketSubjectValidator()
    {
        RuleFor(x => x.ExternalTicketTopicId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.Template).MaximumLength(2000);
        RuleFor(x => x.Suggestions)
            .Must(items => items is null || items.Count <= 20)
            .WithMessage("รายการแนะนำต้องไม่เกิน 20 รายการ");
        RuleForEach(x => x.Suggestions).NotEmpty().MaximumLength(100);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

internal static class ExternalSubjectGuidance
{
    public static string SerializeSuggestions(IReadOnlyList<string>? suggestions)
    {
        var cleaned = (suggestions ?? [])
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .Distinct()
            .ToList();
        return JsonSerializer.Serialize(cleaned);
    }

    public static IReadOnlyList<string> DeserializeSuggestions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

public class CreateExternalTicketSubjectHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateExternalTicketSubjectCommand, ExternalTicketSubjectDto>
{
    public async Task<ExternalTicketSubjectDto> Handle(CreateExternalTicketSubjectCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var topicExists = await db.ExternalTicketTopics.AnyAsync(t => t.Id == request.ExternalTicketTopicId, ct);
        if (!topicExists) throw new KeyNotFoundException("ไม่พบหัวข้อที่ระบุ");

        var name = request.Name.Trim();
        if (await db.ExternalTicketSubjects.AnyAsync(s => s.ExternalTicketTopicId == request.ExternalTicketTopicId && s.Name == name, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"มีหัวข้อ '{name}' อยู่แล้วในหัวข้อนี้ (อาจถูกปิดใช้งานอยู่) — ให้เปิดใช้งานรายการเดิมแทนการสร้างใหม่");

        var subject = new ExternalTicketSubject
        {
            ExternalTicketTopicId = request.ExternalTicketTopicId,
            Name = name,
            Description = TrimOrNull(request.Description),
            Template = TrimOrNull(request.Template),
            SuggestionsJson = ExternalSubjectGuidance.SerializeSuggestions(request.Suggestions),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedBy = currentUser.EmployeeId,
        };
        db.ExternalTicketSubjects.Add(subject);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketSubject", subject.Id.ToString(), "create",
            $"สร้างหัวข้อแจ้งเรื่องบุคคลภายนอก '{subject.Name}'", null,
            new { subject.ExternalTicketTopicId, subject.Name, subject.Description, subject.Template, subject.SuggestionsJson, subject.SortOrder }, ct);

        return new ExternalTicketSubjectDto(subject.Id, subject.ExternalTicketTopicId,
            subject.Name, subject.Description, subject.Template,
            ExternalSubjectGuidance.DeserializeSuggestions(subject.SuggestionsJson),
            subject.SortOrder, subject.IsActive);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record UpdateExternalTicketSubjectCommand(
    Guid Id, string Name, string? Description,
    string? Template, IReadOnlyList<string>? Suggestions, int SortOrder, bool IsActive)
    : IRequest<ExternalTicketSubjectDto>;

public class UpdateExternalTicketSubjectValidator : AbstractValidator<UpdateExternalTicketSubjectCommand>
{
    public UpdateExternalTicketSubjectValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.Template).MaximumLength(2000);
        RuleFor(x => x.Suggestions)
            .Must(items => items is null || items.Count <= 20)
            .WithMessage("รายการแนะนำต้องไม่เกิน 20 รายการ");
        RuleForEach(x => x.Suggestions).NotEmpty().MaximumLength(100);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateExternalTicketSubjectHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateExternalTicketSubjectCommand, ExternalTicketSubjectDto>
{
    public async Task<ExternalTicketSubjectDto> Handle(UpdateExternalTicketSubjectCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var subject = await db.ExternalTicketSubjects.FirstOrDefaultAsync(s => s.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อที่ระบุ");

        var name = request.Name.Trim();
        if (await db.ExternalTicketSubjects.AnyAsync(s =>
            s.ExternalTicketTopicId == subject.ExternalTicketTopicId && s.Name == name && s.Id != subject.Id, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"มีหัวข้อ '{name}' อยู่แล้วในหัวข้อนี้ (อาจถูกปิดใช้งานอยู่) — ให้เปิดใช้งานรายการเดิมแทนการสร้างใหม่");

        var oldValues = new { subject.Name, subject.Description, subject.Template, subject.SuggestionsJson, subject.SortOrder, subject.IsActive };
        subject.Name = name;
        subject.Description = TrimOrNull(request.Description);
        subject.Template = TrimOrNull(request.Template);
        subject.SuggestionsJson = ExternalSubjectGuidance.SerializeSuggestions(request.Suggestions);
        subject.SortOrder = request.SortOrder;
        subject.IsActive = request.IsActive;
        subject.UpdatedAt = DateTime.UtcNow.AddHours(7);
        subject.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketSubject", subject.Id.ToString(), "update",
            $"แก้ไขหัวข้อแจ้งเรื่องบุคคลภายนอก '{subject.Name}'", oldValues,
            new { subject.Name, subject.Description, subject.Template, subject.SuggestionsJson, subject.SortOrder, subject.IsActive }, ct);

        return new ExternalTicketSubjectDto(subject.Id, subject.ExternalTicketTopicId,
            subject.Name, subject.Description, subject.Template,
            ExternalSubjectGuidance.DeserializeSuggestions(subject.SuggestionsJson),
            subject.SortOrder, subject.IsActive);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
