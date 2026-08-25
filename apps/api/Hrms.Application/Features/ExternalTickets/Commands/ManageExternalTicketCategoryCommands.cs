using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Commands;

public record CreateExternalTicketCategoryCommand(string Name, string? Description, int SortOrder)
    : IRequest<ExternalTicketCategoryDto>;

public class CreateExternalTicketCategoryValidator : AbstractValidator<CreateExternalTicketCategoryCommand>
{
    public CreateExternalTicketCategoryValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class CreateExternalTicketCategoryHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateExternalTicketCategoryCommand, ExternalTicketCategoryDto>
{
    public async Task<ExternalTicketCategoryDto> Handle(CreateExternalTicketCategoryCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var name = request.Name.Trim();
        if (await db.ExternalTicketCategories.AnyAsync(c => c.Name == name, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"มีหมวด '{name}' อยู่แล้ว (อาจถูกปิดใช้งานอยู่) — ให้เปิดใช้งานรายการเดิมแทนการสร้างใหม่");

        var category = new ExternalTicketCategory
        {
            Name = name,
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedBy = currentUser.EmployeeId,
        };
        db.ExternalTicketCategories.Add(category);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketCategory", category.Id.ToString(), "create",
            $"สร้างหมวดแจ้งเรื่องบุคคลภายนอก '{category.Name}'", null,
            new { category.Name, category.Description, category.SortOrder }, ct);

        return ToDto(category);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static ExternalTicketCategoryDto ToDto(ExternalTicketCategory c) =>
        new(c.Id, c.Name, c.Description, c.SortOrder, c.IsActive);
}

public record UpdateExternalTicketCategoryCommand(Guid Id, string Name, string? Description, int SortOrder, bool IsActive)
    : IRequest<ExternalTicketCategoryDto>;

public class UpdateExternalTicketCategoryValidator : AbstractValidator<UpdateExternalTicketCategoryCommand>
{
    public UpdateExternalTicketCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateExternalTicketCategoryHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateExternalTicketCategoryCommand, ExternalTicketCategoryDto>
{
    public async Task<ExternalTicketCategoryDto> Handle(UpdateExternalTicketCategoryCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var category = await db.ExternalTicketCategories.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดที่ระบุ");

        var name = request.Name.Trim();
        if (await db.ExternalTicketCategories.AnyAsync(c => c.Name == name && c.Id != category.Id, ct))
            throw new ConflictException("EXTERNAL_TAXONOMY_NAME_DUPLICATE",
                $"มีหมวด '{name}' อยู่แล้ว (อาจถูกปิดใช้งานอยู่) — ให้เปิดใช้งานรายการเดิมแทนการสร้างใหม่");

        var oldValues = new { category.Name, category.Description, category.SortOrder, category.IsActive };
        category.Name = name;
        category.Description = TrimOrNull(request.Description);
        category.SortOrder = request.SortOrder;
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow.AddHours(7);
        category.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketCategory", category.Id.ToString(), "update",
            $"แก้ไขหมวดแจ้งเรื่องบุคคลภายนอก '{category.Name}'", oldValues,
            new { category.Name, category.Description, category.SortOrder, category.IsActive }, ct);

        return new ExternalTicketCategoryDto(category.Id, category.Name, category.Description, category.SortOrder, category.IsActive);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
