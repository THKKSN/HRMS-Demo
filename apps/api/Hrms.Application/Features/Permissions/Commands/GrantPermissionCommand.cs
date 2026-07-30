using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Commands;

public record GrantPermissionCommand(Guid RoleId, Guid PermissionId) : IRequest<Unit>;

public class GrantPermissionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<GrantPermissionCommand, Unit>
{
    public async Task<Unit> Handle(GrantPermissionCommand request, CancellationToken cancellationToken)
    {
        var role = await db.SystemRoles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        var exists = await db.RolePermissions.AnyAsync(
            rp => rp.RoleId == request.RoleId && rp.PermissionId == request.PermissionId,
            cancellationToken);

        if (!exists)
        {
            var now = DateTime.UtcNow.AddHours(7);
            db.RolePermissions.Add(new RolePermission
            {
                Id = Guid.NewGuid(),
                RoleId = request.RoleId,
                PermissionId = request.PermissionId,
                GrantedBy = currentUser.EmployeeId,
                GrantedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await permService.InvalidateCacheAsync(role.Code.ToString());

            await auditLog.LogAsync(
                module:      "permission",
                entityType:  "RolePermission",
                entityId:    $"{request.RoleId}:{request.PermissionId}",
                action:      "grant",
                description: $"เพิ่ม permission {request.PermissionId} ให้ role {role.Code}",
                oldValues:   null,
                newValues:   new { roleId = request.RoleId, role = role.Code, permissionId = request.PermissionId },
                ct:          cancellationToken);
        }

        return Unit.Value;
    }
}
