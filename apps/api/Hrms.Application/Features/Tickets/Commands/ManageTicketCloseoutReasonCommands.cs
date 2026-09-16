using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Commands;

internal static class TicketCloseoutReasonSupport
{
    public const string ManagePermission = "ticket:manage-closeout-reasons";

    public static TicketCloseoutReasonDto ToDto(TicketCloseoutReason reason) => new(
        reason.Id,
        reason.CompanyId,
        reason.DepartmentId,
        reason.Name,
        reason.Description,
        reason.Kind,
        reason.LegacyProblemType,
        reason.SortOrder,
        reason.IsActive,
        reason.Categories.Select(link => link.CategoryId).OrderBy(id => id).ToList(),
        reason.RequiresResolutionNote,
        reason.RequiresCompletionEvidence,
        reason.NameEn,
        reason.NameId);

    /// <summary>ผู้จัดการต้องมีสิทธิ์ใน scope ของเหตุผล: แผนก (ถ้าผูกแผนก) หรือระดับบริษัท (ถ้าใช้ทั้งบริษัท)</summary>
    public static Task EnsureScopeAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissionService,
        Guid companyId,
        Guid? departmentId,
        CancellationToken ct)
        => departmentId.HasValue
            ? TicketManagementAccess.EnsureDepartmentAsync(db, currentUser, permissionService, ManagePermission, companyId, departmentId.Value, ct)
            : TicketManagementAccess.EnsureCompanyAsync(db, currentUser, permissionService, ManagePermission, companyId, ct);

    /// <summary>หมวดที่ผูกต้องอยู่ในบริษัทเดียวกัน และถ้าเหตุผลผูกแผนก หมวดก็ต้องเป็นของแผนกนั้น</summary>
    public static async Task<List<Guid>> ValidateCategoryIdsAsync(
        IApplicationDbContext db,
        Guid companyId,
        Guid? departmentId,
        IReadOnlyList<Guid>? categoryIds,
        CancellationToken ct)
    {
        var distinct = (categoryIds ?? []).Distinct().ToList();
        if (distinct.Count == 0) return distinct;

        var validCount = await db.TicketCategories.CountAsync(c =>
            distinct.Contains(c.Id) &&
            c.CompanyId == companyId &&
            (!departmentId.HasValue || c.DepartmentId == departmentId.Value), ct);
        if (validCount != distinct.Count)
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_CATEGORY_SCOPE_MISMATCH", "Some categories belong to a different company or department than this closeout reason.");
        return distinct;
    }

    public static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record CreateTicketCloseoutReasonCommand(
    Guid CompanyId,
    Guid? DepartmentId,
    string Name,
    string? Description,
    int SortOrder,
    IReadOnlyList<Guid>? CategoryIds,
    bool RequiresResolutionNote = true,
    bool RequiresCompletionEvidence = true,
    string? NameEn = null,
    string? NameId = null) : IRequest<TicketCloseoutReasonDto>;

public class CreateTicketCloseoutReasonValidator : AbstractValidator<CreateTicketCloseoutReasonCommand>
{
    public CreateTicketCloseoutReasonValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
        RuleFor(x => x)
            .Must(x => x.DepartmentId.HasValue || (x.CategoryIds?.Count ?? 0) == 0)
            .WithErrorCode("TICKET_CLOSEOUT_REASON_COMPANY_SCOPE_NO_CATEGORY").WithMessage("A company-wide closeout reason cannot be linked to categories because categories belong to a department.");
    }
}

public class CreateTicketCloseoutReasonHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<CreateTicketCloseoutReasonCommand, TicketCloseoutReasonDto>
{
    public async Task<TicketCloseoutReasonDto> Handle(CreateTicketCloseoutReasonCommand request, CancellationToken ct)
    {
        await TicketCloseoutReasonSupport.EnsureScopeAsync(db, currentUser, permissionService, request.CompanyId, request.DepartmentId, ct);

        var name = request.Name.Trim();
        var duplicated = await db.TicketCloseoutReasons.AnyAsync(r =>
            r.CompanyId == request.CompanyId && r.DepartmentId == request.DepartmentId &&
            r.Kind == TicketCloseoutReason.ProblemTypeKind && r.Name == name, ct);
        if (duplicated)
            throw new ConflictException("DUPLICATE_TICKET_CLOSEOUT_REASON", $"Closeout reason '{name}' already exists in this scope.");

        var categoryIds = await TicketCloseoutReasonSupport.ValidateCategoryIdsAsync(
            db, request.CompanyId, request.DepartmentId, request.CategoryIds, ct);

        var reason = new TicketCloseoutReason
        {
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            Description = TicketCloseoutReasonSupport.TrimOrNull(request.Description),
            SortOrder = request.SortOrder,
            IsActive = true,
            RequiresResolutionNote = request.RequiresResolutionNote,
            RequiresCompletionEvidence = request.RequiresCompletionEvidence,
            CreatedByEmployeeId = currentUser.EmployeeId,
            CreatedBy = currentUser.EmployeeId,
            UpdatedBy = currentUser.EmployeeId
        };
        foreach (var categoryId in categoryIds)
            reason.Categories.Add(new TicketCloseoutReasonCategory { CloseoutReasonId = reason.Id, CategoryId = categoryId });
        db.TicketCloseoutReasons.Add(reason);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketCloseoutReason", reason.Id.ToString(), "create",
            $"สร้างเหตุผลปิดงาน '{reason.Name}'", null,
            new
            {
                reason.CompanyId, reason.DepartmentId, reason.Name, reason.Description, reason.SortOrder,
                reason.RequiresResolutionNote, reason.RequiresCompletionEvidence, CategoryIds = categoryIds
            }, ct);

        return TicketCloseoutReasonSupport.ToDto(reason);
    }
}

public record UpdateTicketCloseoutReasonCommand(
    Guid Id,
    string Name,
    string? Description,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<Guid>? CategoryIds,
    bool RequiresResolutionNote = true,
    bool RequiresCompletionEvidence = true,
    string? NameEn = null,
    string? NameId = null) : IRequest<TicketCloseoutReasonDto>;

public class UpdateTicketCloseoutReasonValidator : AbstractValidator<UpdateTicketCloseoutReasonCommand>
{
    public UpdateTicketCloseoutReasonValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 9999);
    }
}

public class UpdateTicketCloseoutReasonHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService, IAuditLogService auditLog)
    : IRequestHandler<UpdateTicketCloseoutReasonCommand, TicketCloseoutReasonDto>
{
    public async Task<TicketCloseoutReasonDto> Handle(UpdateTicketCloseoutReasonCommand request, CancellationToken ct)
    {
        var reason = await db.TicketCloseoutReasons
            .Include(r => r.Categories)
            .FirstOrDefaultAsync(r => r.Id == request.Id, ct)
            ?? throw new NotFoundException("TicketCloseoutReason", request.Id, "TICKET_CLOSEOUT_REASON_NOT_FOUND");
        await TicketCloseoutReasonSupport.EnsureScopeAsync(db, currentUser, permissionService, reason.CompanyId, reason.DepartmentId, ct);
        if (!reason.DepartmentId.HasValue && (request.CategoryIds?.Count ?? 0) > 0)
            throw new BadRequestException("TICKET_CLOSEOUT_REASON_COMPANY_SCOPE_NO_CATEGORY", "A company-wide closeout reason cannot be linked to categories because categories belong to a department.");

        var name = request.Name.Trim();
        var duplicated = await db.TicketCloseoutReasons.AnyAsync(r =>
            r.Id != reason.Id && r.CompanyId == reason.CompanyId && r.DepartmentId == reason.DepartmentId &&
            r.Kind == reason.Kind && r.Name == name, ct);
        if (duplicated)
            throw new ConflictException("DUPLICATE_TICKET_CLOSEOUT_REASON", $"Closeout reason '{name}' already exists in this scope.");

        var categoryIds = await TicketCloseoutReasonSupport.ValidateCategoryIdsAsync(
            db, reason.CompanyId, reason.DepartmentId, request.CategoryIds, ct);

        var oldValues = new
        {
            reason.Name, reason.Description, reason.SortOrder, reason.IsActive,
            reason.RequiresResolutionNote, reason.RequiresCompletionEvidence,
            CategoryIds = reason.Categories.Select(link => link.CategoryId).ToList()
        };
        reason.Name = name;
        reason.NameEn = Common.Helpers.NameText.Apply(reason.NameEn, request.NameEn);
        reason.NameId = Common.Helpers.NameText.Apply(reason.NameId, request.NameId);
        reason.Description = TicketCloseoutReasonSupport.TrimOrNull(request.Description);
        reason.SortOrder = request.SortOrder;
        reason.IsActive = request.IsActive;
        reason.RequiresResolutionNote = request.RequiresResolutionNote;
        reason.RequiresCompletionEvidence = request.RequiresCompletionEvidence;
        reason.UpdatedBy = currentUser.EmployeeId;

        // sync ตาราง mapping ให้ตรงชุดที่ส่งมา — ลบเฉพาะแถว mapping (ไม่ใช่ entity หลัก จึงไม่ขัด soft-delete convention)
        var wanted = categoryIds.ToHashSet();
        foreach (var link in reason.Categories.Where(link => !wanted.Contains(link.CategoryId)).ToList())
        {
            reason.Categories.Remove(link);
            db.TicketCloseoutReasonCategories.Remove(link);
        }
        var existing = reason.Categories.Select(link => link.CategoryId).ToHashSet();
        foreach (var categoryId in wanted.Where(id => !existing.Contains(id)))
            reason.Categories.Add(new TicketCloseoutReasonCategory { CloseoutReasonId = reason.Id, CategoryId = categoryId });
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "TicketCloseoutReason", reason.Id.ToString(), "update",
            $"แก้ไขเหตุผลปิดงาน '{reason.Name}'", oldValues,
            new
            {
                reason.Name, reason.Description, reason.SortOrder, reason.IsActive,
                reason.RequiresResolutionNote, reason.RequiresCompletionEvidence, CategoryIds = categoryIds
            }, ct);

        return TicketCloseoutReasonSupport.ToDto(reason);
    }
}
