using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoSubCategoriesQuery(Guid MemoCategoryId, bool IncludeInactive = false)
    : IRequest<IReadOnlyList<MemoSubCategoryDto>>;

public class GetMemoSubCategoriesHandler(IApplicationDbContext db)
    : IRequestHandler<GetMemoSubCategoriesQuery, IReadOnlyList<MemoSubCategoryDto>>
{
    public async Task<IReadOnlyList<MemoSubCategoryDto>> Handle(GetMemoSubCategoriesQuery request, CancellationToken ct)
    {
        var query = db.MemoSubCategories.Where(x => x.MemoCategoryId == request.MemoCategoryId);
        if (!request.IncludeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new MemoSubCategoryDto(x.Id, x.MemoCategoryId, x.Name, x.IsActive))
            .ToListAsync(ct);
    }
}
