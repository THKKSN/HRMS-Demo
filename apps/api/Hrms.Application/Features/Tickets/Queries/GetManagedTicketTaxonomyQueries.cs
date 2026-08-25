using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetManagedTicketCategoriesQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<TicketCategoryDto>>;

public class GetManagedTicketCategoriesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetManagedTicketCategoriesQuery, IReadOnlyList<TicketCategoryDto>>
{
    public async Task<IReadOnlyList<TicketCategoryDto>> Handle(GetManagedTicketCategoriesQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-categories", request.CompanyId, request.DepartmentId, ct);

        return await db.TicketCategories
            .Where(c => c.CompanyId == request.CompanyId && c.DepartmentId == request.DepartmentId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new TicketCategoryDto(c.Id, c.CompanyId, c.DepartmentId, c.Name, c.Description, c.SortOrder, c.IsActive, c.EnableResponsibilityFallback, c.RoutingMode))
            .ToListAsync(ct);
    }
}

public record GetManagedTicketTopicsQuery(Guid CompanyId, Guid DepartmentId, Guid CategoryId)
    : IRequest<IReadOnlyList<TicketTopicDto>>;

public class GetManagedTicketTopicsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetManagedTicketTopicsQuery, IReadOnlyList<TicketTopicDto>>
{
    public async Task<IReadOnlyList<TicketTopicDto>> Handle(GetManagedTicketTopicsQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var categoryExists = await db.TicketCategories.AnyAsync(c =>
            c.Id == request.CategoryId && c.CompanyId == request.CompanyId && c.DepartmentId == request.DepartmentId, ct);
        if (!categoryExists) throw new KeyNotFoundException("ไม่พบหมวดที่ระบุ");

        return await db.TicketTopics
            .Where(t => t.CompanyId == request.CompanyId &&
                        t.DepartmentId == request.DepartmentId &&
                        t.CategoryId == request.CategoryId)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new TicketTopicDto(t.Id, t.CompanyId, t.DepartmentId, t.CategoryId, t.Name, t.Description, t.SortOrder, t.IsActive, t.RoutingMode, t.SyncToExternalRepairSystem))
            .ToListAsync(ct);
    }
}

public record GetManagedTicketSubjectsQuery(Guid CompanyId, Guid DepartmentId, Guid CategoryId, Guid TopicId)
    : IRequest<IReadOnlyList<TicketSubjectDto>>;

public class GetManagedTicketSubjectsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetManagedTicketSubjectsQuery, IReadOnlyList<TicketSubjectDto>>
{
    public async Task<IReadOnlyList<TicketSubjectDto>> Handle(GetManagedTicketSubjectsQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, "ticket:manage-topics", request.CompanyId, request.DepartmentId, ct);

        var topicExists = await db.TicketTopics.AnyAsync(t =>
            t.Id == request.TopicId &&
            t.CompanyId == request.CompanyId &&
            t.DepartmentId == request.DepartmentId &&
            t.CategoryId == request.CategoryId, ct);
        if (!topicExists) throw new KeyNotFoundException("ไม่พบหมวดย่อยที่ระบุ");

        return await db.TicketSubjects
            .Where(s => s.CompanyId == request.CompanyId &&
                        s.DepartmentId == request.DepartmentId &&
                        s.CategoryId == request.CategoryId &&
                        s.TopicId == request.TopicId)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new TicketSubjectDto(s.Id, s.CompanyId, s.DepartmentId, s.CategoryId, s.TopicId,
                s.Name, s.Description, s.SortOrder, s.IsActive))
            .ToListAsync(ct);
    }
}
