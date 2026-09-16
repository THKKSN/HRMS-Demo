using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record CreateMemoSubCategoryCommand(Guid MemoCategoryId, string Name, string? NameEn = null, string? NameId = null) : IRequest<MemoSubCategoryDto>;

public class CreateMemoSubCategoryValidator : AbstractValidator<CreateMemoSubCategoryCommand>
{
    public CreateMemoSubCategoryValidator()
    {
        RuleFor(x => x.MemoCategoryId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
    }
}

public class CreateMemoSubCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateMemoSubCategoryCommand, MemoSubCategoryDto>
{
    public async Task<MemoSubCategoryDto> Handle(CreateMemoSubCategoryCommand request, CancellationToken ct)
    {
        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.MemoCategoryId, ct)
            ?? throw new NotFoundException("MemoCategory", request.MemoCategoryId, "MEMO_CATEGORY_NOT_FOUND");

        if (!category.IsActive)
            throw new ConflictException("MEMO_CATEGORY_INACTIVE", "This category is inactive.");

        var name = request.Name.Trim();

        if (await db.MemoSubCategories.AnyAsync(x =>
                x.MemoCategoryId == request.MemoCategoryId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_SUB_CATEGORY", $"Sub-category '{name}' already exists in this category.");

        var subCategory = new MemoSubCategory
        {
            MemoCategoryId = request.MemoCategoryId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
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

        return new MemoSubCategoryDto(subCategory.Id, subCategory.MemoCategoryId, subCategory.Name, subCategory.IsActive, subCategory.NameEn, subCategory.NameId);
    }
}
