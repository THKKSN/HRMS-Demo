using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Permissions.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Queries;

public record GetRolePermissionsQuery(Guid RoleId)
    : IRequest<RolePermissionSummaryDto>;

public class GetRolePermissionsHandler(IApplicationDbContext db)
    : IRequestHandler<GetRolePermissionsQuery, RolePermissionSummaryDto>
{
    public async Task<RolePermissionSummaryDto> Handle(
        GetRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        return await db.SystemRoles
            .AsNoTracking()
            .Where(role => role.Id == request.RoleId && role.IsActive)
            .Select(role => new RolePermissionSummaryDto(
                role.Id,
                role.Code.ToString(),
                role.NameTh,
                role.RolePermissions
                    .Select(rp => rp.Permission.Code)
                    .OrderBy(code => code)
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");
    }
}
