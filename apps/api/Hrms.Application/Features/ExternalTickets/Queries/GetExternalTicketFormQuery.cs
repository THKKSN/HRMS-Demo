using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using Hrms.Domain.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Queries;

// Public — เรียกจาก external session (LIFF) ไม่ต้องมี permission แต่ห้ามคืน internal taxonomy identifier/mapping
public record GetExternalTicketFormQuery : IRequest<ExternalTicketFormDto>;

public class GetExternalTicketFormHandler(IApplicationDbContext db)
    : IRequestHandler<GetExternalTicketFormQuery, ExternalTicketFormDto>
{
    public async Task<ExternalTicketFormDto> Handle(GetExternalTicketFormQuery request, CancellationToken ct)
    {
        var config = await db.ExternalTicketConfigurations
            .FirstOrDefaultAsync(c => c.TargetCompanyId == ExternalTicketConstants.TargetCompanyId, ct);

        // ปิดใช้งาน (หรือยังไม่ตั้งค่าเลย) → รายงานว่าช่องทางปิดใช้งาน แทนการคืน form ที่สร้างเรื่องได้
        if (config is null || !config.IsEnabled)
            return new ExternalTicketFormDto(false, false, []);

        var subjects = await db.ExternalTicketSubjects
            .Where(s => s.IsActive)
            .Select(s => new { s.Id, s.ExternalTicketTopicId, s.Name, s.Description, s.Template, s.SuggestionsJson, s.SortOrder })
            .ToListAsync(ct);

        var visibleSubjectsByTopic = subjects
            .GroupBy(s => s.ExternalTicketTopicId)
            .ToDictionary(g => g.Key, g => g.OrderBy(s => s.SortOrder).ThenBy(s => s.Name).ToList());

        // ห้ามใช้ Dictionary.ContainsKey ใน EF query — แปลเป็น SQL ไม่ได้ ต้องใช้ List.Contains แทน
        var visibleTopicIds = visibleSubjectsByTopic.Keys.ToList();
        var topics = await db.ExternalTicketTopics
            .Where(t => t.IsActive && visibleTopicIds.Contains(t.Id))
            .Select(t => new { t.Id, t.ExternalTicketCategoryId, t.Name, t.Description, t.SortOrder })
            .ToListAsync(ct);

        var visibleTopicsByCategory = topics
            .GroupBy(t => t.ExternalTicketCategoryId)
            .ToDictionary(g => g.Key, g => g.OrderBy(t => t.SortOrder).ThenBy(t => t.Name).ToList());

        var visibleCategoryIds = visibleTopicsByCategory.Keys.ToList();
        var categories = await db.ExternalTicketCategories
            .Where(c => c.IsActive && visibleCategoryIds.Contains(c.Id))
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Description })
            .ToListAsync(ct);

        var categoryDtos = categories.Select(c => new ExternalTicketFormCategoryDto(
            c.Id, c.Name, c.Description,
            visibleTopicsByCategory[c.Id].Select(t => new ExternalTicketFormTopicDto(
                t.Id, t.Name, t.Description,
                visibleSubjectsByTopic[t.Id].Select(s => new ExternalTicketFormSubjectDto(
                    s.Id, s.Name, s.Description, s.Template,
                    Commands.ExternalSubjectGuidance.DeserializeSuggestions(s.SuggestionsJson))).ToList()))
                .ToList()))
            .ToList();

        return new ExternalTicketFormDto(true, config.RequireOaFriendship, categoryDtos);
    }
}
