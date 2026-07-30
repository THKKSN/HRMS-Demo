using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.ToggleEmployeeStatus;

public record ToggleEmployeeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleEmployeeStatusHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IScopeGuard scope,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<ToggleEmployeeStatusCommand>
{
    public async Task Handle(ToggleEmployeeStatusCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "employee:toggle-status", ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        if (!request.IsActive && employee.Id == currentUser.EmployeeId)
            throw new ConflictException("CANNOT_DEACTIVATE_SELF", "ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้");

        employee.IsActive  = request.IsActive;
        employee.UpdatedAt = DateTime.UtcNow.AddHours(7);

        if (!request.IsActive)
        {
            var tokens = await db.RefreshTokens
                .Where(t => t.EmployeeId == request.Id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var token in tokens)
                token.RevokedAt = DateTime.UtcNow.AddHours(7);
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "employee",
            entityType:  "Employee",
            entityId:    employee.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}การใช้งานพนักงาน {employee.FirstName} {employee.LastName} รหัส {employee.EmployeeCode}",
            oldValues:   new { isActive = !request.IsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);
    }
}
