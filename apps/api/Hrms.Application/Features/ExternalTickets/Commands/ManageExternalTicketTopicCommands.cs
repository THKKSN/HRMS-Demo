using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Commands;

public record CreateExternalTicketTopicCommand(Guid ExternalTicketCategoryId, string Name, string? Description, int SortOrder, string? NameEn = null, string? NameId = null)
    : IRequest<ExternalTicketTopicDto>;

public class CreateExternalTicketTopicValidator : AbstractValidator<CreateExternalTicketTopicCommand>
{
    public CreateExternalTicketTopicValidator()
    {
        RuleFor(x => x.ExternalTicketCategoryId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class CreateExternalTicketTopicHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateExternalTicketTopicCommand, ExternalTicketTopicDto>
{
    public async Task<ExternalTicketTopicDto> Handle(CreateExternalTicketTopicCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var categoryExists = await db.ExternalTicketCategories.AnyAsync(c => c.Id == request.ExternalTicketCategoryId, ct);
        if (!categoryExists) throw new NotFoundException("ExternalTicketCategory", request.ExternalTicketCategoryId, "TICKET_CATEGORY_NOT_FOUND");

        var name = request.Name.Trim();
        if (await db.ExternalTicketTopics.AnyAsync(t => t.ExternalTicketCategoryId == request.ExternalTicketCategoryId && t.Name == name, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"Topic '{name}' already exists in this category (it may be inactive). Reactivate the existing one instead of creating a new one.");

        var topic = new ExternalTicketTopic
        {
            ExternalTicketCategoryId = request.ExternalTicketCategoryId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedBy = currentUser.EmployeeId,
        };
        db.ExternalTicketTopics.Add(topic);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketTopic", topic.Id.ToString(), "create",
            $"สร้างหัวข้อแจ้งเรื่องบุคคลภายนอก '{topic.Name}'", null,
            new { topic.ExternalTicketCategoryId, topic.Name, topic.Description, topic.SortOrder }, ct);

        return ToDto(topic);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static ExternalTicketTopicDto ToDto(ExternalTicketTopic t) =>
        new(t.Id, t.ExternalTicketCategoryId, t.Name, t.Description, t.SortOrder, t.IsActive, t.NameEn, t.NameId);
}

public record UpdateExternalTicketTopicCommand(Guid Id, string Name, string? Description, int SortOrder, bool IsActive, string? NameEn = null, string? NameId = null)
    : IRequest<ExternalTicketTopicDto>;

public class UpdateExternalTicketTopicValidator : AbstractValidator<UpdateExternalTicketTopicCommand>
{
    public UpdateExternalTicketTopicValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateExternalTicketTopicHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateExternalTicketTopicCommand, ExternalTicketTopicDto>
{
    public async Task<ExternalTicketTopicDto> Handle(UpdateExternalTicketTopicCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var topic = await db.ExternalTicketTopics.FirstOrDefaultAsync(t => t.Id == request.Id, ct)
            ?? throw new NotFoundException("ExternalTicketTopic", request.Id, "TICKET_TOPIC_NOT_FOUND");

        var name = request.Name.Trim();
        if (await db.ExternalTicketTopics.AnyAsync(t =>
            t.ExternalTicketCategoryId == topic.ExternalTicketCategoryId && t.Name == name && t.Id != topic.Id, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"Topic '{name}' already exists in this category (it may be inactive). Reactivate the existing one instead of creating a new one.");

        var oldValues = new { topic.Name, topic.Description, topic.SortOrder, topic.IsActive };
        topic.Name = name;
        topic.NameEn = Common.Helpers.NameText.Apply(topic.NameEn, request.NameEn);
        topic.NameId = Common.Helpers.NameText.Apply(topic.NameId, request.NameId);
        topic.Description = TrimOrNull(request.Description);
        topic.SortOrder = request.SortOrder;
        topic.IsActive = request.IsActive;
        topic.UpdatedAt = DateTime.UtcNow.AddHours(7);
        topic.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketTopic", topic.Id.ToString(), "update",
            $"แก้ไขหัวข้อแจ้งเรื่องบุคคลภายนอก '{topic.Name}'", oldValues,
            new { topic.Name, topic.Description, topic.SortOrder, topic.IsActive }, ct);

        return new ExternalTicketTopicDto(topic.Id, topic.ExternalTicketCategoryId, topic.Name, topic.Description, topic.SortOrder, topic.IsActive,
            topic.NameEn, topic.NameId);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
