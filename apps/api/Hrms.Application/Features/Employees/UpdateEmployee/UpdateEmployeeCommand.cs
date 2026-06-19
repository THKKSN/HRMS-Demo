using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
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
    Guid? RoleLabelId = null) : IRequest<EmployeeDetailDto>;

public class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeCommand>
{
    public UpdateEmployeeValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public class UpdateEmployeeHandler(IApplicationDbContext db, IScopeGuard scope, ICurrentUser currentUser)
    : IRequestHandler<UpdateEmployeeCommand, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(UpdateEmployeeCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles)
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

        if (request.CompanyId.HasValue && currentUser.HasRole(RoleType.Admin))
        {
            employee.CompanyId    = request.CompanyId.Value;
            employee.DepartmentId = null;
        }

        employee.FirstName    = request.FirstName;
        employee.LastName     = request.LastName;
        employee.Email        = request.Email;
        employee.Phone        = request.Phone;
        employee.HireDate     = request.HireDate;
        employee.DepartmentId = request.DepartmentId ?? employee.DepartmentId;
        employee.RoleLabelId  = request.RoleLabelId;
        employee.UpdatedAt    = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return employee.ToDetailDto(department?.Name ?? employee.Department?.Name);
    }
}
