using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.AddEmployeeRole;

public record AddEmployeeRoleCommand(
    Guid EmployeeId,
    RoleType Role,
    Guid? DepartmentId) : IRequest<EmployeeRoleDto>;

public class AddEmployeeRoleValidator : AbstractValidator<AddEmployeeRoleCommand>
{
    public AddEmployeeRoleValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
    }
}

public class AddEmployeeRoleHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<AddEmployeeRoleCommand, EmployeeRoleDto>
{
    public async Task<EmployeeRoleDto> Handle(AddEmployeeRoleCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        var duplicate = await db.EmployeeRoles.AnyAsync(r =>
            r.EmployeeId == request.EmployeeId &&
            r.Role == request.Role &&
            r.CompanyId == employee.CompanyId &&
            r.DepartmentId == request.DepartmentId &&
            r.IsActive, ct);

        if (duplicate)
            throw new ConflictException("DUPLICATE_ROLE", $"พนักงานมีสิทธิ์ {request.Role} นี้อยู่แล้ว");

        var role = new EmployeeRole
        {
            EmployeeId   = request.EmployeeId,
            Role         = request.Role,
            CompanyId    = employee.CompanyId,
            DepartmentId = request.DepartmentId,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        db.EmployeeRoles.Add(role);
        await db.SaveChangesAsync(ct);

        return new EmployeeRoleDto(role.Id, role.Role, role.CompanyId ?? employee.CompanyId, role.DepartmentId, role.IsActive);
    }
}
