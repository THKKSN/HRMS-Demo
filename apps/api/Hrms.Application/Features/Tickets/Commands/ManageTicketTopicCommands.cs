using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record CreateTicketTopicCommand(
    Guid CompanyId, Guid DepartmentId, Guid CategoryId, string Name, string? Description, int SortOrder,
    bool SyncToExternalRepairSystem = false, string? NameEn = null, string? NameId = null)
    : IRequest<TicketTopicDto>;

public class CreateTicketTopicValidator : AbstractValidator<CreateTicketTopicCommand>
{
    public CreateTicketTopicValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class CreateTicketTopicHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateTicketTopicCommand, TicketTopicDto>
{
    public async Task<TicketTopicDto> Handle(CreateTicketTopicCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var categoryExists = await db.TicketCategories.AnyAsync(c =>
            c.Id == request.CategoryId && c.CompanyId == request.CompanyId && c.DepartmentId == request.DepartmentId, ct);
        if (!categoryExists) throw new NotFoundException("TicketCategory", request.CategoryId, "TICKET_CATEGORY_NOT_FOUND");

        var name = request.Name.Trim();
        if (await db.TicketTopics.AnyAsync(t => t.CategoryId == request.CategoryId && t.Name == name, ct))
            throw new ConflictException("DUPLICATE_TICKET_TOPIC", $"Topic '{name}' already exists in this category.");

        var topic = new TicketTopic
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            CategoryId = request.CategoryId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            SyncToExternalRepairSystem = request.SyncToExternalRepairSystem,
            CreatedByEmployeeId = currentUser.EmployeeId
        };
        db.TicketTopics.Add(topic);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketTopic", topic.Id.ToString(), "create",
            $"สร้างหัวข้อแจ้งเรื่อง '{topic.Name}'", null,
            new { topic.CompanyId, topic.DepartmentId, topic.CategoryId, topic.Name, topic.Description, topic.SortOrder, topic.SyncToExternalRepairSystem }, ct);

        return ToDto(topic);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    // NameEn/NameId เป็น optional parameter ท้าย record — ต้องส่งชื่อ argument เสมอ ไม่งั้นตอบกลับเป็น null ทั้งที่บันทึกแล้ว
    private static TicketTopicDto ToDto(TicketTopic t) =>
        new(t.Id, t.CompanyId, t.DepartmentId, t.CategoryId, t.Name, t.Description, t.SortOrder, t.IsActive, t.RoutingMode, t.SyncToExternalRepairSystem,
            NameEn: t.NameEn, NameId: t.NameId);
}

public record UpdateTicketTopicCommand(
    Guid Id, string Name, string? Description, int SortOrder, bool IsActive,
    bool SyncToExternalRepairSystem = false, string? NameEn = null, string? NameId = null)
    : IRequest<TicketTopicDto>;

public class UpdateTicketTopicValidator : AbstractValidator<UpdateTicketTopicCommand>
{
    public UpdateTicketTopicValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateTicketTopicHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketTopicCommand, TicketTopicDto>
{
    public async Task<TicketTopicDto> Handle(UpdateTicketTopicCommand request, CancellationToken ct)
    {
        var topic = await db.TicketTopics.FirstOrDefaultAsync(t => t.Id == request.Id, ct)
            ?? throw new NotFoundException("TicketTopic", request.Id, "TICKET_TOPIC_NOT_FOUND");
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", topic.CompanyId, topic.DepartmentId, ct);

        var name = request.Name.Trim();
        if (await db.TicketTopics.AnyAsync(t => t.CategoryId == topic.CategoryId && t.Name == name && t.Id != topic.Id, ct))
            throw new ConflictException("DUPLICATE_TICKET_TOPIC", $"Topic '{name}' already exists in this category.");

        var oldValues = new { topic.Name, topic.Description, topic.SortOrder, topic.IsActive, topic.SyncToExternalRepairSystem };
        topic.Name = name;
        topic.NameEn = Common.Helpers.NameText.Apply(topic.NameEn, request.NameEn);
        topic.NameId = Common.Helpers.NameText.Apply(topic.NameId, request.NameId);
        topic.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        topic.SortOrder = request.SortOrder;
        topic.IsActive = request.IsActive;
        topic.SyncToExternalRepairSystem = request.SyncToExternalRepairSystem;
        topic.UpdatedAt = DateTime.UtcNow.AddHours(7);
        topic.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketTopic", topic.Id.ToString(), "update",
            $"แก้ไขหัวข้อแจ้งเรื่อง '{topic.Name}'", oldValues,
            new { topic.Name, topic.Description, topic.SortOrder, topic.IsActive, topic.SyncToExternalRepairSystem }, ct);

        return new TicketTopicDto(topic.Id, topic.CompanyId, topic.DepartmentId, topic.CategoryId, topic.Name,
            topic.Description, topic.SortOrder, topic.IsActive, topic.RoutingMode, topic.SyncToExternalRepairSystem,
            topic.NameEn, topic.NameId);
    }
}
