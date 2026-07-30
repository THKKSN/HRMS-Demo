using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Departments.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Departments.Commands;

public record CreateDepartmentCommand(
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId) : IRequest<DepartmentDto>;

public class CreateDepartmentValidator : AbstractValidator<CreateDepartmentCommand>
{
    public CreateDepartmentValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DeptType).MaximumLength(50).When(x => x.DeptType is not null);
    }
}

public class CreateDepartmentHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<CreateDepartmentCommand, DepartmentDto>
{
    public async Task<DepartmentDto> Handle(CreateDepartmentCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "company:manage-departments", ct);

        if (!currentUser.CanManageCompany(request.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการแผนกใน company นี้");

        if (await db.Departments.AnyAsync(d => d.CompanyId == request.CompanyId && d.Name == request.Name, ct))
            throw new ConflictException("DUPLICATE_DEPARTMENT", $"ชื่อแผนก '{request.Name}' มีอยู่แล้วใน company นี้");

        Employee? manager = null;
        if (request.ManagerEmployeeId.HasValue)
        {
            manager = await db.Employees.FirstOrDefaultAsync(
                e => e.Id == request.ManagerEmployeeId.Value && e.CompanyId == request.CompanyId && e.IsActive, ct)
                ?? throw new KeyNotFoundException("ไม่พบข้อมูลหัวหน้าแผนก หรือไม่ได้อยู่ใน company เดียวกัน");
        }

        var dept = new Department
        {
            CompanyId         = request.CompanyId,
            Name              = request.Name,
            DeptType          = request.DeptType,
            ManagerEmployeeId = request.ManagerEmployeeId,
            IsActive          = true,
            CreatedAt         = DateTime.UtcNow.AddHours(7),
            UpdatedAt         = DateTime.UtcNow.AddHours(7),
        };

        db.Departments.Add(dept);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "department",
            entityType:  "Department",
            entityId:    dept.Id.ToString(),
            action:      "create",
            description: $"สร้างแผนก '{dept.Name}' ใน company {dept.CompanyId}",
            oldValues:   null,
            newValues:   new { dept.Name, dept.DeptType, dept.CompanyId, dept.ManagerEmployeeId },
            ct:          ct);

        return new DepartmentDto(
            dept.Id,
            dept.CompanyId,
            dept.Name,
            dept.DeptType,
            dept.ManagerEmployeeId,
            manager is null ? null : $"{manager.FirstName} {manager.LastName}".Trim(),
            null,
            null,
            dept.IsActive);
    }
}
