using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.TicketRouting;

public record EmployeeResponsibilityDto(
    Guid Id, Guid CompanyId, Guid DepartmentId, Guid CategoryId, string CategoryName,
    Guid? TopicId, string? TopicName, Guid EmployeeId, string EmployeeCode, string EmployeeName,
    bool EmployeeIsEligible, bool IsActive, DateOnly? EffectiveFrom, DateOnly? EffectiveTo,
    string? Note, DateTime UpdatedAt);

public record ResponsibilityEmployeeDto(
    Guid Id, string EmployeeCode, string EmployeeName, string? RoleLabelName, bool IsActive);

public record TicketRoutingPreviewDto(
    TicketRoutingLevel Level, TicketRoutingMode Mode, TicketRoutingOutcome Outcome,
    IReadOnlyList<TicketRoutingCandidate> Candidates);

public record TicketRoutingCoverageDto(
    int TotalTopics, int CoveredTopics, int UncoveredTopics,
    int AutoAssignTopics, int AutoAssignWithMultipleCandidates, int CategoryFallbacks);

public record GetResponsibilitiesQuery(
    Guid CompanyId, Guid DepartmentId, Guid? CategoryId, Guid? TopicId)
    : IRequest<IReadOnlyList<EmployeeResponsibilityDto>>;

public class GetResponsibilitiesHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions)
    : IRequestHandler<GetResponsibilitiesQuery, IReadOnlyList<EmployeeResponsibilityDto>>
{
    public async Task<IReadOnlyList<EmployeeResponsibilityDto>> Handle(GetResponsibilitiesQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, user, permissions, "ticket:manage-responsibilities", request.CompanyId, request.DepartmentId, ct);
        var query = db.EmployeeResponsibilities.AsNoTracking()
            .Where(r => r.CompanyId == request.CompanyId && r.DepartmentId == request.DepartmentId);
        if (request.CategoryId.HasValue) query = query.Where(r => r.CategoryId == request.CategoryId.Value);
        if (request.TopicId.HasValue) query = query.Where(r => r.TopicId == request.TopicId.Value);
        return await query.OrderBy(r => r.Category.Name).ThenBy(r => r.Topic!.Name).ThenBy(r => r.Employee.FirstName)
            .Select(r => new EmployeeResponsibilityDto(
                r.Id, r.CompanyId, r.DepartmentId, r.CategoryId, r.Category.Name,
                r.TopicId, r.Topic == null ? null : r.Topic.Name, r.EmployeeId, r.Employee.EmployeeCode,
                (r.Employee.FirstName + " " + r.Employee.LastName).Trim(),
                r.Employee.IsActive && r.Employee.CompanyId == r.CompanyId && r.Employee.DepartmentId == r.DepartmentId,
                r.IsActive, r.EffectiveFrom, r.EffectiveTo, r.Note, r.UpdatedAt))
            .ToListAsync(ct);
    }
}

public record GetResponsibilityEmployeesQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<ResponsibilityEmployeeDto>>;

public class GetResponsibilityEmployeesHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions)
    : IRequestHandler<GetResponsibilityEmployeesQuery, IReadOnlyList<ResponsibilityEmployeeDto>>
{
    public async Task<IReadOnlyList<ResponsibilityEmployeeDto>> Handle(GetResponsibilityEmployeesQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, user, permissions, "ticket:manage-responsibilities", request.CompanyId, request.DepartmentId, ct);
        return await db.Employees.AsNoTracking()
            .Where(e => e.CompanyId == request.CompanyId && e.DepartmentId == request.DepartmentId && e.IsActive)
            .OrderBy(e => e.FirstName).ThenBy(e => e.LastName)
            .Select(e => new ResponsibilityEmployeeDto(e.Id, e.EmployeeCode,
                (e.FirstName + " " + e.LastName).Trim(), e.RoleLabel == null ? null : e.RoleLabel.Name, e.IsActive))
            .ToListAsync(ct);
    }
}

public record CreateResponsibilityCommand(
    Guid CompanyId, Guid DepartmentId, Guid CategoryId, Guid? TopicId, Guid EmployeeId,
    DateOnly? EffectiveFrom, DateOnly? EffectiveTo, string? Note) : IRequest<EmployeeResponsibilityDto>;

public class CreateResponsibilityValidator : AbstractValidator<CreateResponsibilityCommand>
{
    public CreateResponsibilityValidator()
    {
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x).Must(x => !x.EffectiveFrom.HasValue || !x.EffectiveTo.HasValue || x.EffectiveFrom <= x.EffectiveTo)
            .WithMessage("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
    }
}

public class CreateResponsibilityHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, IAuditLogService audit)
    : IRequestHandler<CreateResponsibilityCommand, EmployeeResponsibilityDto>
{
    public async Task<EmployeeResponsibilityDto> Handle(CreateResponsibilityCommand request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, user, permissions, "ticket:manage-responsibilities", request.CompanyId, request.DepartmentId, ct);
        var category = await db.TicketCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId &&
            c.CompanyId == request.CompanyId && c.DepartmentId == request.DepartmentId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดที่ระบุ");
        TicketTopic? topic = null;
        if (request.TopicId.HasValue)
            topic = await db.TicketTopics.FirstOrDefaultAsync(t => t.Id == request.TopicId &&
                t.CategoryId == request.CategoryId && t.DepartmentId == request.DepartmentId, ct)
                ?? throw new KeyNotFoundException("ไม่พบหัวข้อย่อยที่ระบุ");
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive &&
            e.CompanyId == request.CompanyId && e.DepartmentId == request.DepartmentId, ct)
            ?? throw new ValidationException("ผู้รับผิดชอบต้องเป็นพนักงาน active ในแผนกที่เลือก");
        if (await db.EmployeeResponsibilities.AnyAsync(r => r.DepartmentId == request.DepartmentId &&
            r.CategoryId == request.CategoryId && r.TopicId == request.TopicId &&
            r.EmployeeId == request.EmployeeId && r.IsActive, ct))
            throw new ConflictException("DUPLICATE_RESPONSIBILITY", "พนักงานคนนี้รับผิดชอบ scope นี้อยู่แล้ว");
        var actorId = user.EmployeeId ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        var item = new EmployeeResponsibility
        {
            CompanyId = request.CompanyId, DepartmentId = request.DepartmentId,
            CategoryId = request.CategoryId, TopicId = request.TopicId, EmployeeId = request.EmployeeId,
            EffectiveFrom = request.EffectiveFrom, EffectiveTo = request.EffectiveTo,
            Note = Trim(request.Note), IsActive = true, CreatedByEmployeeId = actorId,
            CreatedBy = actorId, UpdatedBy = actorId
        };
        if (!request.TopicId.HasValue)
        {
            category.EnableResponsibilityFallback = true;
            category.UpdatedBy = actorId;
        }
        db.EmployeeResponsibilities.Add(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ticket", "EmployeeResponsibility", item.Id.ToString(), "create-responsibility",
            $"กำหนด {employee.FirstName} {employee.LastName} รับผิดชอบ {(topic?.Name ?? category.Name)}",
            null, new { item.CompanyId, item.DepartmentId, item.CategoryId, item.TopicId, item.EmployeeId }, ct);
        return ToDto(item, category.Name, topic?.Name, employee);
    }

    internal static EmployeeResponsibilityDto ToDto(
        EmployeeResponsibility r, string categoryName, string? topicName, Employee e)
        => new(r.Id, r.CompanyId, r.DepartmentId, r.CategoryId, categoryName, r.TopicId, topicName,
            e.Id, e.EmployeeCode, (e.FirstName + " " + e.LastName).Trim(), true,
            r.IsActive, r.EffectiveFrom, r.EffectiveTo, r.Note, r.UpdatedAt);
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record UpdateResponsibilityCommand(
    Guid Id, bool IsActive, DateOnly? EffectiveFrom, DateOnly? EffectiveTo,
    string? Note, DateTime? ExpectedUpdatedAt, bool PreserveDetails = false) : IRequest<EmployeeResponsibilityDto>;

public class UpdateResponsibilityHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, IAuditLogService audit)
    : IRequestHandler<UpdateResponsibilityCommand, EmployeeResponsibilityDto>
{
    public async Task<EmployeeResponsibilityDto> Handle(UpdateResponsibilityCommand request, CancellationToken ct)
    {
        if (request.EffectiveFrom.HasValue && request.EffectiveTo.HasValue && request.EffectiveFrom > request.EffectiveTo)
            throw new ValidationException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
        var item = await db.EmployeeResponsibilities.Include(r => r.Category).Include(r => r.Topic).Include(r => r.Employee)
            .FirstOrDefaultAsync(r => r.Id == request.Id, ct) ?? throw new KeyNotFoundException("ไม่พบ responsibility");
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, user, permissions, "ticket:manage-responsibilities", item.CompanyId, item.DepartmentId, ct);
        if (request.ExpectedUpdatedAt.HasValue && Math.Abs((item.UpdatedAt - request.ExpectedUpdatedAt.Value).TotalMilliseconds) > 1)
            throw new ConflictException("ROUTING_CONFIG_CHANGED", "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดใหม่");
        var old = new { item.IsActive, item.EffectiveFrom, item.EffectiveTo, item.Note };
        if (request.IsActive && !item.IsActive && await db.EmployeeResponsibilities.AnyAsync(r =>
            r.Id != item.Id && r.DepartmentId == item.DepartmentId && r.CategoryId == item.CategoryId &&
            r.TopicId == item.TopicId && r.EmployeeId == item.EmployeeId && r.IsActive, ct))
            throw new ConflictException("DUPLICATE_RESPONSIBILITY", "พนักงานคนนี้รับผิดชอบ scope นี้อยู่แล้ว");
        item.IsActive = request.IsActive;
        if (!request.PreserveDetails)
        {
            item.EffectiveFrom = request.EffectiveFrom;
            item.EffectiveTo = request.EffectiveTo;
            item.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        }
        item.UpdatedBy = user.EmployeeId;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ticket", "EmployeeResponsibility", item.Id.ToString(), "update-responsibility",
            $"แก้ไข responsibility ของ {item.Employee.FirstName} {item.Employee.LastName}", old,
            new { item.IsActive, item.EffectiveFrom, item.EffectiveTo, item.Note }, ct);
        return CreateResponsibilityHandler.ToDto(item, item.Category.Name, item.Topic?.Name, item.Employee);
    }
}

public record UpdateTopicRoutingCommand(Guid TopicId, TicketRoutingMode Mode, DateTime? ExpectedUpdatedAt) : IRequest;
public record UpdateCategoryRoutingCommand(
    Guid CategoryId, bool EnableFallback, TicketRoutingMode Mode, DateTime? ExpectedUpdatedAt) : IRequest;

public class UpdateTopicRoutingHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, IAuditLogService audit)
    : IRequestHandler<UpdateTopicRoutingCommand>
{
    public async Task Handle(UpdateTopicRoutingCommand request, CancellationToken ct)
    {
        var topic = await db.TicketTopics.FirstOrDefaultAsync(t => t.Id == request.TopicId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อย่อย");
        await TicketManagementAccess.EnsureDepartmentAsync(db, user, permissions,
            "ticket:manage-responsibilities", topic.CompanyId, topic.DepartmentId, ct);
        EnsureVersion(topic.UpdatedAt, request.ExpectedUpdatedAt);
        var old = topic.RoutingMode;
        topic.RoutingMode = request.Mode;
        topic.UpdatedBy = user.EmployeeId;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ticket", "TicketTopic", topic.Id.ToString(), "update-routing-mode",
            $"เปลี่ยน routing mode ของหัวข้อ {topic.Name}", new { RoutingMode = old }, new { topic.RoutingMode }, ct);
    }
    internal static void EnsureVersion(DateTime current, DateTime? expected)
    {
        if (expected.HasValue && Math.Abs((current - expected.Value).TotalMilliseconds) > 1)
            throw new ConflictException("ROUTING_CONFIG_CHANGED", "ข้อมูล routing ถูกแก้ไขแล้ว กรุณาโหลดใหม่");
    }
}

public class UpdateCategoryRoutingHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, IAuditLogService audit)
    : IRequestHandler<UpdateCategoryRoutingCommand>
{
    public async Task Handle(UpdateCategoryRoutingCommand request, CancellationToken ct)
    {
        var category = await db.TicketCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวด");
        await TicketManagementAccess.EnsureDepartmentAsync(db, user, permissions,
            "ticket:manage-responsibilities", category.CompanyId, category.DepartmentId, ct);
        UpdateTopicRoutingHandler.EnsureVersion(category.UpdatedAt, request.ExpectedUpdatedAt);
        var old = new { category.EnableResponsibilityFallback, category.RoutingMode };
        category.EnableResponsibilityFallback = request.EnableFallback;
        category.RoutingMode = request.Mode;
        category.UpdatedBy = user.EmployeeId;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ticket", "TicketCategory", category.Id.ToString(), "update-routing-mode",
            $"เปลี่ยน routing ของหมวด {category.Name}", old,
            new { category.EnableResponsibilityFallback, category.RoutingMode }, ct);
    }
}

public record PreviewTicketRoutingQuery(Guid CompanyId, Guid DepartmentId, Guid CategoryId, Guid TopicId)
    : IRequest<TicketRoutingPreviewDto>;

public class PreviewTicketRoutingHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, ITicketRoutingService routing)
    : IRequestHandler<PreviewTicketRoutingQuery, TicketRoutingPreviewDto>
{
    public async Task<TicketRoutingPreviewDto> Handle(PreviewTicketRoutingQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(db, user, permissions,
            "ticket:manage-responsibilities", request.CompanyId, request.DepartmentId, ct);
        var result = await routing.ResolveAsync(request.CompanyId, request.DepartmentId,
            request.CategoryId, request.TopicId, DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)), ct);
        return new TicketRoutingPreviewDto(result.Level, result.Mode, result.Outcome, result.Candidates);
    }
}

public record GetTicketRoutingCoverageQuery(Guid CompanyId, Guid DepartmentId) : IRequest<TicketRoutingCoverageDto>;

public class GetTicketRoutingCoverageHandler(
    IApplicationDbContext db, ICurrentUser user, IPermissionService permissions, ITicketRoutingService routing)
    : IRequestHandler<GetTicketRoutingCoverageQuery, TicketRoutingCoverageDto>
{
    public async Task<TicketRoutingCoverageDto> Handle(GetTicketRoutingCoverageQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(db, user, permissions,
            "ticket:manage-responsibilities", request.CompanyId, request.DepartmentId, ct);
        var topics = await db.TicketTopics.AsNoTracking().Where(t => t.CompanyId == request.CompanyId &&
            t.DepartmentId == request.DepartmentId && t.IsActive).Select(t => new { t.Id, t.CategoryId, t.RoutingMode }).ToListAsync(ct);
        var covered = 0;
        var multiAuto = 0;
        foreach (var topic in topics)
        {
            var result = await routing.ResolveAsync(request.CompanyId, request.DepartmentId,
                topic.CategoryId, topic.Id, DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)), ct);
            if (result.Candidates.Count > 0) covered++;
            if (result.Mode == TicketRoutingMode.AutoAssignSingle && result.Candidates.Count > 1) multiAuto++;
        }
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var fallback = await db.EmployeeResponsibilities.AsNoTracking()
            .Where(r => r.CompanyId == request.CompanyId && r.DepartmentId == request.DepartmentId &&
                r.TopicId == null && r.IsActive &&
                (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= today) &&
                (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= today))
            .Select(r => r.CategoryId)
            .Distinct()
            .CountAsync(ct);
        return new TicketRoutingCoverageDto(topics.Count, covered, topics.Count - covered,
            topics.Count(t => t.RoutingMode == TicketRoutingMode.AutoAssignSingle), multiAuto, fallback);
    }
}
