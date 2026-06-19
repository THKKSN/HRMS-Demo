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
    bool IsActive) : IRequest<DepartmentDto>;

public class UpdateDepartmentValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DeptType).MaximumLength(50).When(x => x.DeptType is not null);
    }
}

public class UpdateDepartmentHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateDepartmentCommand, DepartmentDto>
{
    public async Task<DepartmentDto> Handle(UpdateDepartmentCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้นที่แก้ไขแผนกได้");

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

        dept.Name              = request.Name;
        dept.DeptType          = request.DeptType;
        dept.ManagerEmployeeId = request.ManagerEmployeeId;
        dept.IsActive          = request.IsActive;
        dept.UpdatedAt         = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new DepartmentDto(
            dept.Id,
            dept.CompanyId,
            dept.Name,
            dept.DeptType,
            dept.ManagerEmployeeId,
            managerName,
            dept.IsActive);
    }
}
