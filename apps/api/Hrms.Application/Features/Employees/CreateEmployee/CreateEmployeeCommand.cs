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

namespace Hrms.Application.Features.Employees.CreateEmployee;

public record CreateEmployeeCommand(
    string EmployeeCode,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? NationalId,
    string Password,
    DateOnly? HireDate,
    Guid? DepartmentId,
    Guid? CompanyId = null,
    Guid? RoleLabelId = null) : IRequest<EmployeeDetailDto>;

public class CreateEmployeeValidator : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeValidator()
    {
        RuleFor(x => x.EmployeeCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
        RuleFor(x => x.NationalId).Length(13).When(x => !string.IsNullOrEmpty(x.NationalId));
    }
}

public class CreateEmployeeHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPasswordService passwordService)
    : IRequestHandler<CreateEmployeeCommand, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(CreateEmployeeCommand request, CancellationToken ct)
    {
        Guid companyId;
        if (request.CompanyId.HasValue && currentUser.HasRole(RoleType.Admin))
            companyId = request.CompanyId.Value;
        else
            companyId = currentUser.CompanyId
                ?? throw new AppUnauthorizedException("ไม่พบข้อมูล company ของผู้ใช้");

        if (await db.Employees.AnyAsync(e => e.CompanyId == companyId && e.EmployeeCode == request.EmployeeCode, ct))
            throw new ConflictException("DUPLICATE_EMPLOYEE_CODE", $"รหัสพนักงาน '{request.EmployeeCode}' มีอยู่แล้วในระบบ");

        if (!string.IsNullOrEmpty(request.Email) &&
            await db.Employees.AnyAsync(e => e.Email == request.Email, ct))
            throw new ConflictException("DUPLICATE_EMAIL", $"อีเมล '{request.Email}' ถูกใช้งานแล้ว");

        if (!string.IsNullOrEmpty(request.NationalId) &&
            await db.Employees.AnyAsync(e => e.NationalId == request.NationalId, ct))
            throw new ConflictException("DUPLICATE_NATIONAL_ID", "หมายเลขบัตรประชาชนนี้มีในระบบแล้ว");

        var department = request.DepartmentId.HasValue
            ? await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId.Value && d.CompanyId == companyId, ct)
            : null;

        var employee = new Employee
        {
            CompanyId    = companyId,
            DepartmentId = request.DepartmentId,
            EmployeeCode = request.EmployeeCode,
            FirstName    = request.FirstName,
            LastName     = request.LastName,
            Email        = request.Email,
            Phone        = request.Phone,
            NationalId   = request.NationalId,
            PasswordHash = passwordService.Hash(request.Password),
            HireDate     = request.HireDate,
            RoleLabelId  = request.RoleLabelId,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        db.Employees.Add(employee);
        await db.SaveChangesAsync(ct);

        return employee.ToDetailDto(department?.Name);
    }
}
