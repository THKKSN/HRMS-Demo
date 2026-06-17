using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.ToggleEmployeeStatus;

public record ToggleEmployeeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleEmployeeStatusHandler(IApplicationDbContext db, ICurrentUser currentUser, IScopeGuard scope)
    : IRequestHandler<ToggleEmployeeStatusCommand>
{
    public async Task Handle(ToggleEmployeeStatusCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        if (!request.IsActive && employee.Id == currentUser.EmployeeId)
            throw new ConflictException("CANNOT_DEACTIVATE_SELF", "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้");

        employee.IsActive  = request.IsActive;
        employee.UpdatedAt = DateTime.UtcNow;

        if (!request.IsActive)
        {
            // revoke refresh tokens ทั้งหมดเมื่อปิดการใช้งาน
            var tokens = await db.RefreshTokens
                .Where(t => t.EmployeeId == request.Id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var token in tokens)
                token.RevokedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }
}
