using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Queries;

public record GetExternalTicketCategoriesQuery : IRequest<IReadOnlyList<ExternalTicketCategoryDto>>;

public class GetExternalTicketCategoriesHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetExternalTicketCategoriesQuery, IReadOnlyList<ExternalTicketCategoryDto>>
{
    public async Task<IReadOnlyList<ExternalTicketCategoryDto>> Handle(GetExternalTicketCategoriesQuery request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        return await db.ExternalTicketCategories
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new ExternalTicketCategoryDto(c.Id, c.Name, c.Description, c.SortOrder, c.IsActive))
            .ToListAsync(ct);
    }
}

public record GetExternalTicketTopicsQuery(Guid ExternalTicketCategoryId) : IRequest<IReadOnlyList<ExternalTicketTopicDto>>;

public class GetExternalTicketTopicsHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetExternalTicketTopicsQuery, IReadOnlyList<ExternalTicketTopicDto>>
{
    public async Task<IReadOnlyList<ExternalTicketTopicDto>> Handle(GetExternalTicketTopicsQuery request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var categoryExists = await db.ExternalTicketCategories.AnyAsync(c => c.Id == request.ExternalTicketCategoryId, ct);
        if (!categoryExists) throw new KeyNotFoundException("ไม่พบหมวดที่ระบุ");

        return await db.ExternalTicketTopics
            .Where(t => t.ExternalTicketCategoryId == request.ExternalTicketCategoryId)
            .OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new ExternalTicketTopicDto(t.Id, t.ExternalTicketCategoryId, t.Name, t.Description, t.SortOrder, t.IsActive))
            .ToListAsync(ct);
    }
}

public record GetExternalTicketSubjectsQuery(Guid ExternalTicketTopicId) : IRequest<IReadOnlyList<ExternalTicketSubjectDto>>;

public class GetExternalTicketSubjectsHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissionService)
    : IRequestHandler<GetExternalTicketSubjectsQuery, IReadOnlyList<ExternalTicketSubjectDto>>
{
    public async Task<IReadOnlyList<ExternalTicketSubjectDto>> Handle(GetExternalTicketSubjectsQuery request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var topicExists = await db.ExternalTicketTopics.AnyAsync(t => t.Id == request.ExternalTicketTopicId, ct);
        if (!topicExists) throw new KeyNotFoundException("ไม่พบหัวข้อที่ระบุ");

        var subjects = await db.ExternalTicketSubjects
            .Where(s => s.ExternalTicketTopicId == request.ExternalTicketTopicId)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new { s.Id, s.ExternalTicketTopicId, s.Name, s.Description, s.Template, s.SuggestionsJson, s.SortOrder, s.IsActive })
            .ToListAsync(ct);

        return subjects
            .Select(s => new ExternalTicketSubjectDto(
                s.Id, s.ExternalTicketTopicId, s.Name, s.Description, s.Template,
                Commands.ExternalSubjectGuidance.DeserializeSuggestions(s.SuggestionsJson),
                s.SortOrder, s.IsActive))
            .ToList();
    }
}
