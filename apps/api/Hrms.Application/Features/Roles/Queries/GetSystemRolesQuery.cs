using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Roles.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Roles.Queries;

// Query เบาๆ สำหรับ dropdown เลือก role ทั่วไป — อ่าน SystemRoles ตรงๆ
// ไม่ join RolePermission (ต่างจาก GetAllRolePermissionsQuery ที่คืน permission matrix เต็มรูปแบบ)
public record GetSystemRolesQuery : IRequest<IReadOnlyList<SystemRoleDto>>;

public class GetSystemRolesHandler(IApplicationDbContext db)
    : IRequestHandler<GetSystemRolesQuery, IReadOnlyList<SystemRoleDto>>
{
    public async Task<IReadOnlyList<SystemRoleDto>> Handle(GetSystemRolesQuery request, CancellationToken ct)
    {
        return await db.SystemRoles
            .AsNoTracking()
            .Where(role => role.IsActive)
            .OrderBy(role => role.Code)
            .Select(role => new SystemRoleDto(role.Id, role.Code.ToString(), role.NameTh))
            .ToListAsync(ct);
    }
}
