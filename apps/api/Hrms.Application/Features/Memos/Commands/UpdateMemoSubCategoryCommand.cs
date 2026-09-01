using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record UpdateMemoSubCategoryCommand(Guid Id, string Name) : IRequest<MemoSubCategoryDto>;

public class UpdateMemoSubCategoryValidator : AbstractValidator<UpdateMemoSubCategoryCommand>
{
    public UpdateMemoSubCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class UpdateMemoSubCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoSubCategoryCommand, MemoSubCategoryDto>
{
    public async Task<MemoSubCategoryDto> Handle(UpdateMemoSubCategoryCommand request, CancellationToken ct)
    {
        var subCategory = await db.MemoSubCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อย่อย");

        var name = request.Name.Trim();

        if (await db.MemoSubCategories.AnyAsync(x =>
                x.Id != request.Id && x.MemoCategoryId == subCategory.MemoCategoryId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_NAME", $"หัวข้อย่อย '{name}' มีอยู่แล้วในหมวดหมู่นี้");

        var oldName = subCategory.Name;
        subCategory.Name = name;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoSubCategory",
            entityId:    subCategory.Id.ToString(),
            action:      "update",
            description: $"แก้ไขหัวข้อย่อย '{oldName}' เป็น '{subCategory.Name}'",
            oldValues:   new { Name = oldName },
            newValues:   new { subCategory.Name },
            ct:          ct);

        return new MemoSubCategoryDto(subCategory.Id, subCategory.MemoCategoryId, subCategory.Name, subCategory.IsActive);
    }
}
