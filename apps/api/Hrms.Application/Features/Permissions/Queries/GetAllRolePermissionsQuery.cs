using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Permissions.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Queries;

public record GetAllRolePermissionsQuery : IRequest<IReadOnlyList<RolePermissionSummaryDto>>;

public class GetAllRolePermissionsHandler(IApplicationDbContext db)
    : IRequestHandler<GetAllRolePermissionsQuery, IReadOnlyList<RolePermissionSummaryDto>>
{
    public async Task<IReadOnlyList<RolePermissionSummaryDto>> Handle(
        GetAllRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        return await db.SystemRoles
            .AsNoTracking()
            .Where(role => role.IsActive && role.Code != Domain.Enums.RoleType.SchoolAdmin)
            .OrderBy(role => role.Code)
            .Select(role => new RolePermissionSummaryDto(
                role.Id,
                role.Code.ToString(),
                role.NameTh,
                role.RolePermissions
                    .Select(rp => rp.Permission.Code)
                    .OrderBy(code => code)
                    .ToList()))
            .ToListAsync(cancellationToken);
    }
}
