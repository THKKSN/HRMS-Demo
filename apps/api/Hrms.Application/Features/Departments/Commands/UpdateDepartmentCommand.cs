using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Departments.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Departments.Commands;

public record UpdateDepartmentCommand(
    Guid Id,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    Guid? ShiftId,
    bool IsActive) : IRequest<DepartmentDto>;

public class UpdateDepartmentValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DeptType).MaximumLength(50).When(x => x.DeptType is not null);
    }
}

public class UpdateDepartmentHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<UpdateDepartmentCommand, DepartmentDto>
{
    public async Task<DepartmentDto> Handle(UpdateDepartmentCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "company:manage-departments", ct);

        var dept = await db.Departments
            .FirstOrDefaultAsync(d => d.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลแผนก");

        if (!currentUser.CanManageCompany(dept.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการแผนกใน company นี้");

        // ตรวจชื่อซ้ำ (ยกเว้นตัวเอง)
        if (await db.Departments.AnyAsync(
            d => d.CompanyId == dept.CompanyId && d.Name == request.Name && d.Id != dept.Id, ct))
            throw new ConflictException("DUPLICATE_DEPARTMENT", $"ชื่อแผนก '{request.Name}' มีอยู่แล้วใน company นี้");

        if (!request.IsActive)
        {
            var hasActiveEmployees = await db.Employees
                .AnyAsync(e => e.DepartmentId == dept.Id && e.IsActive, ct);
            if (hasActiveEmployees)
                throw new ConflictException("DEPARTMENT_IN_USE", "ไม่สามารถปิดแผนกที่ยังมีพนักงาน active อยู่");
        }

        string? managerName = null;
        if (request.ManagerEmployeeId.HasValue)
        {
            var manager = await db.Employees.FirstOrDefaultAsync(
                e => e.Id == request.ManagerEmployeeId.Value && e.CompanyId == dept.CompanyId && e.IsActive, ct)
                ?? throw new KeyNotFoundException("ไม่พบข้อมูลหัวหน้าแผนก หรือไม่ได้อยู่ใน company เดียวกัน");
            managerName = $"{manager.FirstName} {manager.LastName}".Trim();
        }

        string? shiftName = null;
        if (request.ShiftId.HasValue)
        {
            var shift = await db.Shifts.FirstOrDefaultAsync(
                s => s.Id == request.ShiftId.Value && s.IsActive, ct)
                ?? throw new KeyNotFoundException("ไม่พบข้อมูลกะการทำงาน");
            shiftName = shift.Name;
        }

        var oldValues = new { dept.Name, dept.DeptType, dept.ManagerEmployeeId, dept.ShiftId, dept.IsActive };

        dept.Name              = request.Name;
        dept.DeptType          = request.DeptType;
        dept.ManagerEmployeeId = request.ManagerEmployeeId;
        dept.ShiftId           = request.ShiftId;
        dept.IsActive          = request.IsActive;
        dept.UpdatedAt         = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "department",
            entityType:  "Department",
            entityId:    dept.Id.ToString(),
            action:      "update",
            description: $"แก้ไขแผนก '{dept.Name}'",
            oldValues:   oldValues,
            newValues:   new { dept.Name, dept.DeptType, dept.ManagerEmployeeId, dept.ShiftId, dept.IsActive },
            ct:          ct);

        return new DepartmentDto(
            dept.Id,
            dept.CompanyId,
            dept.Name,
            dept.DeptType,
            dept.ManagerEmployeeId,
            managerName,
            dept.ShiftId,
            shiftName,
            dept.IsActive);
    }
}
