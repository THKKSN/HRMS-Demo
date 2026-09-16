using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ประเภทเรื่องใหม่เริ่มด้วยผู้อนุมัติด่านแรก = Executive ทุกคน (ค่าเริ่มต้นของ entity)
// ปรับภายหลังผ่าน SetMemoTypeFirstApproverCommand ที่หน้าลำดับขั้นตอน
public record CreateMemoTypeCommand(string Name, Guid CompanyId, Guid DepartmentId, string? NameEn = null, string? NameId = null) : IRequest<MemoTypeDto>;

public class CreateMemoTypeValidator : AbstractValidator<CreateMemoTypeCommand>
{
    public CreateMemoTypeValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.DepartmentId).NotEmpty();
    }
}

public class CreateMemoTypeHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateMemoTypeCommand, MemoTypeDto>
{
    public async Task<MemoTypeDto> Handle(CreateMemoTypeCommand request, CancellationToken ct)
    {
        var name = request.Name.Trim();

        if (await db.MemoTypes.AnyAsync(x => x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_TYPE", $"Memo type '{name}' already exists.");

        var company = await db.Companies.FirstOrDefaultAsync(x => x.Id == request.CompanyId, ct)
            ?? throw new NotFoundException("Company", request.CompanyId, "COMPANY_NOT_FOUND");

        var department = await db.Departments.FirstOrDefaultAsync(x => x.Id == request.DepartmentId, ct)
            ?? throw new NotFoundException("Department", request.DepartmentId, "DEPARTMENT_NOT_FOUND");
        if (department.CompanyId != request.CompanyId)
            throw new ConflictException("DEPARTMENT_COMPANY_MISMATCH", "The selected department does not belong to the selected company.");

        var memoType = new MemoType
        {
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            IsActive = true,
        };

        db.MemoTypes.Add(memoType);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoType",
            entityId:    memoType.Id.ToString(),
            action:      "create",
            description: $"สร้างประเภทเรื่อง '{memoType.Name}' (ส่งเข้า {company.Name} / {department.Name})",
            oldValues:   null,
            newValues:   new { memoType.Name, memoType.CompanyId, memoType.DepartmentId },
            ct:          ct);

        return new MemoTypeDto(
            memoType.Id, memoType.Name, memoType.CompanyId, company.Name,
            memoType.DepartmentId, department.Name, memoType.IsActive,
            memoType.FirstApproverRoleCode, memoType.FirstApproverEmployeeId, null,
            memoType.NameEn, memoType.NameId,
            CompanyNameEn: company.NameEn, CompanyNameId: company.NameId,
            DepartmentNameEn: department.NameEn, DepartmentNameId: department.NameId);
    }
}
