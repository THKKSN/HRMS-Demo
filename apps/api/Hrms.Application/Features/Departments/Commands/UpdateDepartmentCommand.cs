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
    bool IsActive,
    string? NameEn = null,
    string? NameId = null) : IRequest<DepartmentDto>;

public class UpdateDepartmentValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
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
            ?? throw new NotFoundException("Department", request.Id, "DEPARTMENT_NOT_FOUND");

        if (!currentUser.CanManageCompany(dept.CompanyId))
            throw new AppForbiddenException("DEPARTMENT_MANAGE_FORBIDDEN", "You are not allowed to manage departments in this company.");

        // ตรวจชื่อซ้ำ (ยกเว้นตัวเอง)
        if (await db.Departments.AnyAsync(
            d => d.CompanyId == dept.CompanyId && d.Name == request.Name && d.Id != dept.Id, ct))
            throw new ConflictException("DUPLICATE_DEPARTMENT", $"Department '{request.Name}' already exists in this company.");

        if (!request.IsActive)
        {
            var hasActiveEmployees = await db.Employees
                .AnyAsync(e => e.DepartmentId == dept.Id && e.IsActive, ct);
            if (hasActiveEmployees)
                throw new ConflictException("DEPARTMENT_IN_USE", "A department with active employees cannot be deactivated.");
        }

        string? managerName = null;
        if (request.ManagerEmployeeId.HasValue)
        {
            var manager = await db.Employees.FirstOrDefaultAsync(
                e => e.Id == request.ManagerEmployeeId.Value && e.CompanyId == dept.CompanyId && e.IsActive, ct)
                ?? throw new NotFoundException("Employee", request.ManagerEmployeeId!, "DEPARTMENT_MANAGER_INVALID");
            managerName = $"{manager.FirstName} {manager.LastName}".Trim();
        }

        string? shiftName = null;
        if (request.ShiftId.HasValue)
        {
            var shift = await db.Shifts.FirstOrDefaultAsync(
                s => s.Id == request.ShiftId.Value && s.IsActive, ct)
                ?? throw new NotFoundException("Shift", request.ShiftId.Value, "SHIFT_NOT_FOUND");
            shiftName = shift.Name;
        }

        var oldValues = new { dept.Name, dept.DeptType, dept.ManagerEmployeeId, dept.ShiftId, dept.IsActive };

        dept.Name              = request.Name;
        dept.NameEn            = Common.Helpers.NameText.Apply(dept.NameEn, request.NameEn);
        dept.NameId            = Common.Helpers.NameText.Apply(dept.NameId, request.NameId);
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
            dept.IsActive,
            NameEn: dept.NameEn,
            NameId: dept.NameId);
    }
}
