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
    Guid? DepartmentId) : IRequest<EmployeeDetailDto>;

public class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeCommand>
{
    public UpdateEmployeeValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public class UpdateEmployeeHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<UpdateEmployeeCommand, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(UpdateEmployeeCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Roles)
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        scope.ThrowIfCannotAccess(employee.CompanyId);

        if (!string.IsNullOrEmpty(request.Email) && request.Email != employee.Email &&
            await db.Employees.AnyAsync(e => e.Email == request.Email && e.Id != request.Id, ct))
            throw new ConflictException("DUPLICATE_EMAIL", $"อีเมล '{request.Email}' ถูกใช้งานแล้ว");

        Department? department = null;
        if (request.DepartmentId.HasValue)
            department = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId.Value, ct);

        employee.FirstName    = request.FirstName;
        employee.LastName     = request.LastName;
        employee.Email        = request.Email;
        employee.Phone        = request.Phone;
        employee.HireDate     = request.HireDate;
        employee.DepartmentId = request.DepartmentId;
        employee.UpdatedAt    = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return employee.ToDetailDto(department?.Name ?? employee.Department?.Name);
    }
}
