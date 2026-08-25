using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.UpdateEmployee;

public record UpdateEmployeeCommand(
    Guid Id,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    DateOnly? HireDate,
    Guid? DepartmentId,
    Guid? CompanyId = null,
    Guid? RoleLabelId = null,
    string? NationalId = null,
    string? Nickname = null) : IRequest<EmployeeDetailDto>;

public class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeCommand>
{
    public UpdateEmployeeValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Nickname).MaximumLength(50);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public class UpdateEmployeeHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateEmployeeCommand, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(UpdateEmployeeCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles).ThenInclude(r => r.Role)
            .Include(e => e.RoleLabel)
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        if (!string.IsNullOrEmpty(request.Email) && request.Email != employee.Email &&
            await db.Employees.AnyAsync(e => e.Email == request.Email && e.Id != request.Id, ct))
            throw new ConflictException("DUPLICATE_EMAIL", $"อีเมล '{request.Email}' ถูกใช้งานแล้ว");

        Department? department = null;
        if (request.DepartmentId.HasValue)
            department = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId.Value, ct);

        if (request.CompanyId.HasValue && await scope.CanAccessCompanyAsync(request.CompanyId.Value, ct))
        {
            employee.CompanyId    = request.CompanyId.Value;
            employee.DepartmentId = null;
        }

        employee.FirstName    = request.FirstName;
        employee.LastName     = request.LastName;
        employee.Nickname     = string.IsNullOrWhiteSpace(request.Nickname) ? null : request.Nickname.Trim();
        employee.Email        = request.Email;
        employee.Phone        = request.Phone;
        employee.HireDate     = request.HireDate;
        employee.DepartmentId = request.DepartmentId ?? employee.DepartmentId;
        employee.RoleLabelId  = request.RoleLabelId;

        // เฉพาะคนที่มี employee:edit จึงแก้ national ID ได้
        var canEdit = await permService.HasPermissionAsync(currentUser, "employee:edit", ct);
        if (!string.IsNullOrEmpty(request.NationalId) && canEdit)
            employee.NationalId = request.NationalId;

        employee.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "employee",
            entityType:  "Employee",
            entityId:    employee.Id.ToString(),
            action:      "update",
            description: $"แก้ไขข้อมูลพนักงาน {employee.FirstName} {employee.LastName} รหัส {employee.EmployeeCode}",
            oldValues:   null,
            newValues:   new { employee.FirstName, employee.LastName, employee.Nickname, employee.Email, employee.Phone, employee.DepartmentId, employee.RoleLabelId },
            ct:          ct);

        return employee.ToDetailDto(department?.Name ?? employee.Department?.Name, canEdit);
    }
}
