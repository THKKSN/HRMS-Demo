using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Employees.Common;
using Hrms.Application.Features.Employees.Dtos;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeImports.ImportEmployee;

public sealed record ImportEmployeeCommand(string NationalId, Guid CompanyId) : IRequest<EmployeeDetailDto>;

public sealed class ImportEmployeeValidator : AbstractValidator<ImportEmployeeCommand>
{
    public ImportEmployeeValidator()
    {
        RuleFor(x => x.NationalId).Matches("^[0-9]{13}$");
        RuleFor(x => x.CompanyId).NotEmpty();
    }
}

public sealed class ImportEmployeeHandler(
    IApplicationDbContext db,
    IScopeGuard scope,
    ICurrentUser currentUser,
    IPiswinEmployeeClient piswinClient,
    IAuditLogService auditLog)
    : IRequestHandler<ImportEmployeeCommand, EmployeeDetailDto>
{
    public async Task<EmployeeDetailDto> Handle(ImportEmployeeCommand request, CancellationToken ct)
    {
        if (!currentUser.Roles.Any(role => role.Role == RoleType.Admin.ToString()))
            throw new AppForbiddenException("ไม่มีสิทธิ์นำเข้าพนักงาน");

        await scope.ThrowIfCannotAccessAsync(request.CompanyId, ct);
        var company = await db.Companies.SingleOrDefaultAsync(
            value => value.Id == request.CompanyId && value.IsActive, ct)
            ?? throw new NotFoundException("บริษัท", request.CompanyId);

        var sourceEmployee = await piswinClient.FindByNationalIdAsync(request.NationalId, ct);

        // Piswin ส่งรหัสมาแบบไม่ pad — normalize ครั้งเดียวแล้วใช้ทั้งตอนเช็กซ้ำและตอนบันทึก
        // ไม่งั้นจะเขียนรหัสรูปแบบเก่ากลับเข้า DB ทับ canonical form
        var employeeCode = EmployeeCodeNormalizer.Normalize(sourceEmployee.EmployeeCode);

        // ตัดสินคนซ้ำจากรหัสพนักงานเท่านั้น ไม่เช็ก national_id
        var isDuplicate = await db.Employees.AnyAsync(
            employee => employee.EmployeeCode == employeeCode, ct);
        if (isDuplicate)
            throw new ConflictException("DUPLICATE_EMPLOYEE", "พนักงานนี้มีอยู่ในระบบแล้ว");

        var employeeRole = await db.SystemRoles.SingleOrDefaultAsync(role =>
            role.Id == SystemRoleIds.Employee && role.Code == RoleType.Employee && role.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูล role พนักงาน");

        var employee = new Employee
        {
            CompanyId = company.Id,
            DepartmentId = null,
            EmployeeCode = employeeCode,
            FirstName = sourceEmployee.FirstName,
            LastName = sourceEmployee.LastName,
            NationalId = sourceEmployee.NationalId,
            HireDate = sourceEmployee.HireDate,
            PasswordHash = null,
            IsActive = sourceEmployee.IsActive
        };
        var role = new EmployeeRole
        {
            Employee = employee,
            EmployeeId = employee.Id,
            Role = employeeRole,
            RoleId = employeeRole.Id,
            CompanyId = company.Id,
            DepartmentId = null,
            GrantedBy = currentUser.EmployeeId,
            IsActive = true
        };
        employee.Roles.Add(role);
        db.Employees.Add(employee);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "employee",
            entityType: "Employee",
            entityId: employee.Id.ToString(),
            action: "import-piswin",
            description: $"นำเข้าพนักงานรหัส {employee.EmployeeCode} จาก PISWIN",
            oldValues: null,
            newValues: new
            {
                employee.EmployeeCode,
                employee.CompanyId,
                ImportedFields = new[] { "ID", "First_Name", "Last_Name", "Id_Card", "Start_Working_Date", "Active" }
            },
            ct: ct);

        return employee.ToDetailDto(null);
    }
}
