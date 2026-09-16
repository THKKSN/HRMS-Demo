using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

// ตั้งผู้อนุมัติด่านแรกของประเภทเรื่อง — แยกจาก UpdateMemoTypeCommand เพื่อไม่ให้การแก้ชื่อ/ปลายทาง
// เผลอ reset ค่านี้กลับเป็น default (EmployeeId = null คือทุกคนใน role)
// เปลี่ยนค่ามีผลกับเรื่องที่สร้างใหม่เท่านั้น เรื่องเดิม snapshot ไว้แล้ว
public record SetMemoTypeFirstApproverCommand(Guid Id, RoleType RoleCode, Guid? EmployeeId)
    : IRequest<MemoTypeDto>;

public class SetMemoTypeFirstApproverValidator : AbstractValidator<SetMemoTypeFirstApproverCommand>
{
    public SetMemoTypeFirstApproverValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.RoleCode).IsInEnum();
    }
}

public class SetMemoTypeFirstApproverHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<SetMemoTypeFirstApproverCommand, MemoTypeDto>
{
    public async Task<MemoTypeDto> Handle(SetMemoTypeFirstApproverCommand request, CancellationToken ct)
    {
        var memoType = await db.MemoTypes
            .Include(x => x.Company)
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoType", request.Id, "MEMO_TYPE_NOT_FOUND");

        var approverName = await CreateMemoWorkflowStepHandler.ValidateAssigneeAsync(
            db, request.EmployeeId, request.RoleCode, ct);

        var oldValues = new { memoType.FirstApproverRoleCode, memoType.FirstApproverEmployeeId };

        memoType.FirstApproverRoleCode = request.RoleCode;
        memoType.FirstApproverEmployeeId = request.EmployeeId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoType",
            entityId:    memoType.Id.ToString(),
            action:      "set-first-approver",
            description: $"ตั้งผู้อนุมัติด่านแรกของ '{memoType.Name}' เป็น {request.RoleCode}"
                         + (approverName is null ? " (ทุกคนใน role)" : $" — {approverName}"),
            oldValues:   oldValues,
            newValues:   new { memoType.FirstApproverRoleCode, memoType.FirstApproverEmployeeId },
            ct:          ct);

        return new MemoTypeDto(
            memoType.Id, memoType.Name, memoType.CompanyId, memoType.Company.Name,
            memoType.DepartmentId, memoType.Department.Name, memoType.IsActive,
            memoType.FirstApproverRoleCode, memoType.FirstApproverEmployeeId, approverName,
            memoType.NameEn, memoType.NameId,
            CompanyNameEn: memoType.Company.NameEn, CompanyNameId: memoType.Company.NameId,
            DepartmentNameEn: memoType.Department.NameEn, DepartmentNameId: memoType.Department.NameId);
    }
}
