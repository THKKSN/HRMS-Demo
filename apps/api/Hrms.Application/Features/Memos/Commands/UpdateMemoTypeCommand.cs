using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ผู้อนุมัติด่านแรกไม่อยู่ในคำสั่งนี้ — ตั้งแยกผ่าน SetMemoTypeFirstApproverCommand
// เพื่อกันการแก้ชื่อ/ปลายทางเผลอ reset ผู้อนุมัติที่ปักหมุดไว้
public record UpdateMemoTypeCommand(Guid Id, string Name, Guid CompanyId, Guid DepartmentId, string? NameEn = null, string? NameId = null)
    : IRequest<MemoTypeDto>;

public class UpdateMemoTypeValidator : AbstractValidator<UpdateMemoTypeCommand>
{
    public UpdateMemoTypeValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
    }
}

public class UpdateMemoTypeHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoTypeCommand, MemoTypeDto>
{
    public async Task<MemoTypeDto> Handle(UpdateMemoTypeCommand request, CancellationToken ct)
    {
        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoType", request.Id, "MEMO_TYPE_NOT_FOUND");

        var name = request.Name.Trim();

        if (await db.MemoTypes.AnyAsync(x => x.Id != request.Id && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_TYPE", $"Memo type '{name}' already exists.");

        var company = await db.Companies.FirstOrDefaultAsync(x => x.Id == request.CompanyId, ct)
            ?? throw new NotFoundException("Company", request.CompanyId, "COMPANY_NOT_FOUND");

        var department = await db.Departments.FirstOrDefaultAsync(x => x.Id == request.DepartmentId, ct)
            ?? throw new NotFoundException("Department", request.DepartmentId, "DEPARTMENT_NOT_FOUND");
        if (department.CompanyId != request.CompanyId)
            throw new ConflictException("DEPARTMENT_COMPANY_MISMATCH", "The selected department does not belong to the selected company.");

        var oldValues = new { memoType.Name, memoType.CompanyId, memoType.DepartmentId };

        memoType.Name = name;
        memoType.NameEn = Common.Helpers.NameText.Apply(memoType.NameEn, request.NameEn);
        memoType.NameId = Common.Helpers.NameText.Apply(memoType.NameId, request.NameId);
        memoType.CompanyId = request.CompanyId;
        memoType.DepartmentId = request.DepartmentId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoType",
            entityId:    memoType.Id.ToString(),
            action:      "update",
            description: $"แก้ไขประเภทเรื่อง '{memoType.Name}' (ส่งเข้า {company.Name} / {department.Name})",
            oldValues:   oldValues,
            newValues:   new { memoType.Name, memoType.CompanyId, memoType.DepartmentId },
            ct:          ct);

        var firstApprover = memoType.FirstApproverEmployeeId is null
            ? null
            : await db.Employees.AsNoTracking()
                .Where(x => x.Id == memoType.FirstApproverEmployeeId)
                .Select(x => (x.FirstName + " " + x.LastName).Trim())
                .FirstOrDefaultAsync(ct);

        return new MemoTypeDto(
            memoType.Id, memoType.Name, memoType.CompanyId, company.Name,
            memoType.DepartmentId, department.Name, memoType.IsActive,
            memoType.FirstApproverRoleCode, memoType.FirstApproverEmployeeId, firstApprover,
            memoType.NameEn, memoType.NameId,
            CompanyNameEn: company.NameEn, CompanyNameId: company.NameId,
            DepartmentNameEn: department.NameEn, DepartmentNameId: department.NameId);
    }
}
