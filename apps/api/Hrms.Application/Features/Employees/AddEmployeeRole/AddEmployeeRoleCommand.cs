using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.AddEmployeeRole;

public record AddEmployeeRoleCommand(
    Guid EmployeeId,
    Guid RoleId,
    Guid? DepartmentId) : IRequest<EmployeeRoleDto>;

public class AddEmployeeRoleValidator : AbstractValidator<AddEmployeeRoleCommand>
{
    public AddEmployeeRoleValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.RoleId).NotEmpty();
    }
}

public class AddEmployeeRoleHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<AddEmployeeRoleCommand, EmployeeRoleDto>
{
    public async Task<EmployeeRoleDto> Handle(AddEmployeeRoleCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "employee:assign-role", ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var systemRole = await db.SystemRoles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role");

        var duplicate = await db.EmployeeRoles.AnyAsync(r =>
            r.EmployeeId == request.EmployeeId &&
            r.RoleId == request.RoleId &&
            r.CompanyId == employee.CompanyId &&
            r.DepartmentId == request.DepartmentId &&
            r.IsActive, ct);

        if (duplicate)
            throw new ConflictException("DUPLICATE_ROLE", $"พนักงานมีสิทธิ์ {systemRole.Code} นี้อยู่แล้ว");

        var role = new EmployeeRole
        {
            EmployeeId   = request.EmployeeId,
            RoleId       = request.RoleId,
            CompanyId    = employee.CompanyId,
            DepartmentId = request.DepartmentId,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow.AddHours(7),
            UpdatedAt    = DateTime.UtcNow.AddHours(7),
        };

        db.EmployeeRoles.Add(role);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "employee",
            entityType:  "EmployeeRole",
            entityId:    employee.Id.ToString(),
            action:      "add-role",
            description: $"เพิ่มสิทธิ์ {systemRole.Code} ให้พนักงาน {employee.FirstName} {employee.LastName}",
            oldValues:   null,
            newValues:   new { role.RoleId, role = systemRole.Code, role.CompanyId, role.DepartmentId },
            ct:          ct);

        return new EmployeeRoleDto(
            role.Id,
            role.RoleId,
            systemRole.Code,
            role.CompanyId ?? employee.CompanyId,
            role.DepartmentId,
            role.IsActive);
    }
}
