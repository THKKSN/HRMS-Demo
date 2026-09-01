using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Permissions.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Permissions.Commands;

public record SetRolePermissionsCommand(Guid RoleId, List<Guid> PermissionIds)
    : IRequest<RolePermissionSummaryDto>;

public class SetRolePermissionsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<SetRolePermissionsCommand, RolePermissionSummaryDto>
{
    // permission ที่อ่อนไหวสูง อนุญาตให้ผูกกับ role ที่กำหนดไว้เท่านั้น ป้องกัน role อื่นได้สิทธิ์นี้ผ่าน permission matrix UI
    private static readonly Dictionary<string, RoleType[]> RestrictedPermissions = new()
    {
        ["memo:approve"] = [RoleType.Admin, RoleType.Executive],
    };

    public async Task<RolePermissionSummaryDto> Handle(
        SetRolePermissionsCommand request, CancellationToken cancellationToken)
    {
        var role = await db.SystemRoles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.IsActive, cancellationToken)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        var existing = await db.RolePermissions
            .Where(rp => rp.RoleId == request.RoleId)
            .ToListAsync(cancellationToken);

        // เพิ่มใหม่ตาม PermissionIds ที่ส่งมา
        var validPerms = await db.Permissions
            .Where(p => request.PermissionIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Code })
            .ToListAsync(cancellationToken);

        foreach (var perm in validPerms)
        {
            if (RestrictedPermissions.TryGetValue(perm.Code, out var allowedRoles) && !allowedRoles.Contains(role.Code))
                throw new ConflictException(
                    "PERMISSION_RESTRICTED",
                    $"permission '{perm.Code}' กำหนดให้ role {string.Join("/", allowedRoles)} เท่านั้น");
        }

        db.RolePermissions.RemoveRange(existing);

        var validPermIds = validPerms.Select(p => p.Id).ToList();

        var now = DateTime.UtcNow.AddHours(7);
        var newEntries = validPermIds.Select(permId => new RolePermission
        {
            Id = Guid.NewGuid(),
            RoleId = request.RoleId,
            PermissionId = permId,
            GrantedBy = currentUser.EmployeeId,
            GrantedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        }).ToList();

        db.RolePermissions.AddRange(newEntries);
        await db.SaveChangesAsync(cancellationToken);
        await permService.InvalidateCacheAsync(role.Code.ToString());

        await auditLog.LogAsync(
            module:      "permission",
            entityType:  "RolePermission",
            entityId:    request.RoleId.ToString(),
            action:      "set-role-permissions",
            description: $"กำหนด permissions ทั้งหมดของ role {role.Code} ใหม่ ({validPermIds.Count} รายการ)",
            oldValues:   new { removed = existing.Count },
            newValues:   new { roleId = request.RoleId, role = role.Code, permissionCount = validPermIds.Count, permissionIds = validPermIds },
            ct:          cancellationToken);

        // Return updated summary
        var codes = await db.RolePermissions
            .Where(rp => rp.RoleId == request.RoleId)
            .Select(rp => rp.Permission.Code)
            .OrderBy(c => c)
            .ToListAsync(cancellationToken);

        return new RolePermissionSummaryDto(request.RoleId, role.Code.ToString(), role.NameTh, codes);
    }
}
