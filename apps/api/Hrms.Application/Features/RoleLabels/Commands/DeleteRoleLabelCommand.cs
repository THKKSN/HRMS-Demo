using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Commands;

public record DeleteRoleLabelCommand(Guid Id) : IRequest;

public class DeleteRoleLabelHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<DeleteRoleLabelCommand>
{
    public async Task Handle(DeleteRoleLabelCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "company:manage-departments", ct);

        var entity = await db.RoleLabels.FirstOrDefaultAsync(r => r.Id == request.Id, ct)
            ?? throw new NotFoundException("RoleLabel", request.Id, "ROLE_LABEL_NOT_FOUND");

        if (!currentUser.CanManageCompany(entity.CompanyId))
            throw new AppForbiddenException("COMPANY_MANAGE_FORBIDDEN", "You are not allowed to manage this company.");

        var inUse = await db.Employees.AnyAsync(e => e.RoleLabelId == request.Id, ct);
        if (inUse)
            throw new ConflictException("ROLE_LABEL_IN_USE", "This job title cannot be removed while employees still use it.");

        entity.IsActive  = false;
        entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "role-label",
            entityType:  "RoleLabel",
            entityId:    entity.Id.ToString(),
            action:      "deactivate",
            description: $"ลบ (soft delete) ตำแหน่งงาน '{entity.Name}'",
            oldValues:   new { isActive = true },
            newValues:   new { isActive = false },
            ct:          ct);
    }
}
