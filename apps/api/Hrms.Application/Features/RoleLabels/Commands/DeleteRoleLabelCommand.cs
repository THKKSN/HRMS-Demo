using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Commands;

public record DeleteRoleLabelCommand(Guid Id) : IRequest;

public class DeleteRoleLabelHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DeleteRoleLabelCommand>
{
    public async Task Handle(DeleteRoleLabelCommand request, CancellationToken ct)
    {
        var entity = await db.RoleLabels.FirstOrDefaultAsync(r => r.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบ Role Label");

        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้น");

        if (!currentUser.CanManageCompany(entity.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการ company นี้");

        var inUse = await db.Employees.AnyAsync(e => e.RoleLabelId == request.Id, ct);
        if (inUse)
            throw new ConflictException("ROLE_LABEL_IN_USE", "ไม่สามารถลบได้ — มีพนักงานที่ใช้ตำแหน่งนี้อยู่");

        db.RoleLabels.Remove(entity);
        await db.SaveChangesAsync(ct);
    }
}
