using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.RemoveEmployeeRole;

public record RemoveEmployeeRoleCommand(Guid EmployeeId, Guid RoleId) : IRequest;

public class RemoveEmployeeRoleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<RemoveEmployeeRoleCommand>
{
    public async Task Handle(RemoveEmployeeRoleCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸™à¸±à¸à¸‡à¸²à¸™");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var role = await db.EmployeeRoles
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.EmployeeId == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥ role");

        // à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸¥à¸š Admin à¸„à¸™à¸ªà¸¸à¸”à¸—à¹‰à¸²à¸¢
        if (role.Role == RoleType.Admin)
        {
            var activeAdminCount = await db.EmployeeRoles
                .CountAsync(r => r.Role == RoleType.Admin && r.CompanyId == employee.CompanyId && r.IsActive, ct);

            if (activeAdminCount <= 1)
                throw new ConflictException("LAST_ADMIN", "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸š Admin à¸„à¸™à¸ªà¸¸à¸”à¸—à¹‰à¸²à¸¢à¸‚à¸­à¸‡à¸šà¸£à¸´à¸©à¸±à¸—à¹„à¸”à¹‰");
        }

        role.IsActive  = false;
        role.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

