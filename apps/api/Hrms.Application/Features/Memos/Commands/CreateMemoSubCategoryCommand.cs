using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record CreateMemoSubCategoryCommand(Guid MemoCategoryId, string Name) : IRequest<MemoSubCategoryDto>;

public class CreateMemoSubCategoryValidator : AbstractValidator<CreateMemoSubCategoryCommand>
{
    public CreateMemoSubCategoryValidator()
    {
        RuleFor(x => x.MemoCategoryId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class CreateMemoSubCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateMemoSubCategoryCommand, MemoSubCategoryDto>
{
    public async Task<MemoSubCategoryDto> Handle(CreateMemoSubCategoryCommand request, CancellationToken ct)
    {
        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.MemoCategoryId, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดหมู่");

        if (!category.IsActive)
            throw new ConflictException("MEMO_CATEGORY_INACTIVE", "หมวดหมู่นี้ถูกปิดใช้งานแล้ว ไม่สามารถเพิ่มหัวข้อย่อยได้");

        var name = request.Name.Trim();

        if (await db.MemoSubCategories.AnyAsync(x =>
                x.MemoCategoryId == request.MemoCategoryId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_NAME", $"หัวข้อย่อย '{name}' มีอยู่แล้วในหมวดหมู่นี้");

        var subCategory = new MemoSubCategory
        {
            MemoCategoryId = request.MemoCategoryId,
            Name = name,
            IsActive = true,
        };

        db.MemoSubCategories.Add(subCategory);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoSubCategory",
            entityId:    subCategory.Id.ToString(),
            action:      "create",
            description: $"สร้างหัวข้อย่อย '{subCategory.Name}' ในหมวดหมู่ '{category.Name}'",
            oldValues:   null,
            newValues:   new { subCategory.MemoCategoryId, subCategory.Name },
            ct:          ct);

        return new MemoSubCategoryDto(subCategory.Id, subCategory.MemoCategoryId, subCategory.Name, subCategory.IsActive);
    }
}
