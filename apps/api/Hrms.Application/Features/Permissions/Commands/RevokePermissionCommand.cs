using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Commands;

public record RevokePermissionCommand(Guid RoleId, Guid PermissionId) : IRequest<Unit>;

public class RevokePermissionHandler(
    IApplicationDbContext db,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<RevokePermissionCommand, Unit>
{
    public async Task<Unit> Handle(RevokePermissionCommand request, CancellationToken cancellationToken)
    {
        var role = await db.SystemRoles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        var rp = await db.RolePermissions.FirstOrDefaultAsync(
            x => x.RoleId == request.RoleId && x.PermissionId == request.PermissionId,
            cancellationToken);

        if (rp is not null)
        {
            db.RolePermissions.Remove(rp);
            await db.SaveChangesAsync(cancellationToken);
            await permService.InvalidateCacheAsync(role.Code.ToString());

            await auditLog.LogAsync(
                module:      "permission",
                entityType:  "RolePermission",
                entityId:    $"{request.RoleId}:{request.PermissionId}",
                action:      "revoke",
                description: $"ถอด permission {request.PermissionId} ออกจาก role {role.Code}",
                oldValues:   new { roleId = request.RoleId, role = role.Code, permissionId = request.PermissionId },
                newValues:   null,
                ct:          cancellationToken);
        }

        return Unit.Value;
    }
}
