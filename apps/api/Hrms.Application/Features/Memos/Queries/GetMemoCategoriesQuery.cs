using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoCategoriesQuery(Guid MemoTypeId, bool IncludeInactive = false)
    : IRequest<IReadOnlyList<MemoCategoryDto>>;

public class GetMemoCategoriesHandler(IApplicationDbContext db)
    : IRequestHandler<GetMemoCategoriesQuery, IReadOnlyList<MemoCategoryDto>>
{
    public async Task<IReadOnlyList<MemoCategoryDto>> Handle(GetMemoCategoriesQuery request, CancellationToken ct)
    {
        var query = db.MemoCategories.Where(x => x.MemoTypeId == request.MemoTypeId);
        if (!request.IncludeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new MemoCategoryDto(x.Id, x.MemoTypeId, x.Name, x.IsActive))
            .ToListAsync(ct);
    }
}
