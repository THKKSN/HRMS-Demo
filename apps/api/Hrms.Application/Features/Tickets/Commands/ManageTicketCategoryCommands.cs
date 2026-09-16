using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

public record CreateTicketCategoryCommand(Guid CompanyId, Guid DepartmentId, string Name, string? Description, int SortOrder,
    string? NameEn = null, string? NameId = null)
    : IRequest<TicketCategoryDto>;

public class CreateTicketCategoryValidator : AbstractValidator<CreateTicketCategoryCommand>
{
    public CreateTicketCategoryValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class CreateTicketCategoryHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateTicketCategoryCommand, TicketCategoryDto>
{
    public async Task<TicketCategoryDto> Handle(CreateTicketCategoryCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-categories", request.CompanyId, request.DepartmentId, ct);

        var name = request.Name.Trim();
        if (await db.TicketCategories.AnyAsync(c => c.DepartmentId == request.DepartmentId && c.Name == name, ct))
            throw new ConflictException("DUPLICATE_TICKET_CATEGORY", $"Ticket category '{name}' already exists in this department.");

        var category = new TicketCategory
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            Description = TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedByEmployeeId = currentUser.EmployeeId
        };
        db.TicketCategories.Add(category);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketCategory", category.Id.ToString(), "create",
            $"สร้างหมวดแจ้งเรื่อง '{category.Name}'", null,
            new { category.CompanyId, category.DepartmentId, category.Name, category.Description, category.SortOrder }, ct);

        return ToDto(category);
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    // NameEn/NameId เป็น optional parameter ท้าย record — ต้องส่งชื่อ argument เสมอ ไม่งั้นตอบกลับเป็น null ทั้งที่บันทึกแล้ว
    private static TicketCategoryDto ToDto(TicketCategory c) =>
        new(c.Id, c.CompanyId, c.DepartmentId, c.Name, c.Description, c.SortOrder, c.IsActive,
            c.EnableResponsibilityFallback, c.RoutingMode, NameEn: c.NameEn, NameId: c.NameId);
}

public record UpdateTicketCategoryCommand(Guid Id, string Name, string? Description, int SortOrder, bool IsActive,
    string? NameEn = null, string? NameId = null)
    : IRequest<TicketCategoryDto>;

public class UpdateTicketCategoryValidator : AbstractValidator<UpdateTicketCategoryCommand>
{
    public UpdateTicketCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateTicketCategoryHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketCategoryCommand, TicketCategoryDto>
{
    public async Task<TicketCategoryDto> Handle(UpdateTicketCategoryCommand request, CancellationToken ct)
    {
        var category = await db.TicketCategories.FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("TicketCategory", request.Id, "TICKET_CATEGORY_NOT_FOUND");
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-categories", category.CompanyId, category.DepartmentId, ct);

        var name = request.Name.Trim();
        if (await db.TicketCategories.AnyAsync(c =>
            c.DepartmentId == category.DepartmentId && c.Name == name && c.Id != category.Id, ct))
            throw new ConflictException("DUPLICATE_TICKET_CATEGORY", $"Ticket category '{name}' already exists in this department.");

        var oldValues = new { category.Name, category.Description, category.SortOrder, category.IsActive };
        category.Name = name;
        category.NameEn = Common.Helpers.NameText.Apply(category.NameEn, request.NameEn);
        category.NameId = Common.Helpers.NameText.Apply(category.NameId, request.NameId);
        category.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        category.SortOrder = request.SortOrder;
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow.AddHours(7);
        category.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketCategory", category.Id.ToString(), "update",
            $"แก้ไขหมวดแจ้งเรื่อง '{category.Name}'", oldValues,
            new { category.Name, category.Description, category.SortOrder, category.IsActive }, ct);

        return new TicketCategoryDto(category.Id, category.CompanyId, category.DepartmentId, category.Name,
            category.Description, category.SortOrder, category.IsActive,
            category.EnableResponsibilityFallback, category.RoutingMode,
            category.NameEn, category.NameId);
    }
}
