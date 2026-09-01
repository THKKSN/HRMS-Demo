using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record CreateMemoTypeCommand(string Name, Guid CompanyId, Guid DepartmentId) : IRequest<MemoTypeDto>;

public class CreateMemoTypeValidator : AbstractValidator<CreateMemoTypeCommand>
{
    public CreateMemoTypeValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
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
            throw new ConflictException("DUPLICATE_NAME", $"ประเภทเรื่อง '{name}' มีอยู่แล้วในระบบ");

        var company = await db.Companies.FirstOrDefaultAsync(x => x.Id == request.CompanyId, ct)
            ?? throw new KeyNotFoundException("ไม่พบบริษัท");

        var department = await db.Departments.FirstOrDefaultAsync(x => x.Id == request.DepartmentId, ct)
            ?? throw new KeyNotFoundException("ไม่พบแผนก");
        if (department.CompanyId != request.CompanyId)
            throw new ConflictException("DEPARTMENT_COMPANY_MISMATCH", "แผนกที่เลือกไม่ได้อยู่ในบริษัทที่เลือก");

        var memoType = new MemoType
        {
            Name = name,
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
            memoType.DepartmentId, department.Name, memoType.IsActive);
    }
}
