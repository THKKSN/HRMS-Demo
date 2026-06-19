using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.RoleLabels.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Queries;

public record GetRoleLabelsQuery(Guid CompanyId, bool IncludeInactive = false)
    : IRequest<IReadOnlyList<RoleLabelDto>>;

public class GetRoleLabelsHandler(IApplicationDbContext db)
    : IRequestHandler<GetRoleLabelsQuery, IReadOnlyList<RoleLabelDto>>
{
    public async Task<IReadOnlyList<RoleLabelDto>> Handle(GetRoleLabelsQuery request, CancellationToken ct)
    {
        var query = db.RoleLabels.Where(r => r.CompanyId == request.CompanyId);
        if (!request.IncludeInactive)
            query = query.Where(r => r.IsActive);

        return await query
            .OrderBy(r => r.Name)
            .Select(r => new RoleLabelDto(r.Id, r.CompanyId, r.Name, r.IsActive))
            .ToListAsync(ct);
    }
}
