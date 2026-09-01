using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoTypesQuery(bool IncludeInactive = false) : IRequest<IReadOnlyList<MemoTypeDto>>;

public class GetMemoTypesHandler(IApplicationDbContext db)
    : IRequestHandler<GetMemoTypesQuery, IReadOnlyList<MemoTypeDto>>
{
    public async Task<IReadOnlyList<MemoTypeDto>> Handle(GetMemoTypesQuery request, CancellationToken ct)
    {
        var query = db.MemoTypes.AsQueryable();
        if (!request.IncludeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new MemoTypeDto(
                x.Id, x.Name, x.CompanyId, x.Company.Name, x.DepartmentId, x.Department.Name, x.IsActive))
            .ToListAsync(ct);
    }
}
