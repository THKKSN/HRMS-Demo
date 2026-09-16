using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record UpdateMemoSubCategoryCommand(Guid Id, string Name, string? NameEn = null, string? NameId = null) : IRequest<MemoSubCategoryDto>;

public class UpdateMemoSubCategoryValidator : AbstractValidator<UpdateMemoSubCategoryCommand>
{
    public UpdateMemoSubCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
    }
}

public class UpdateMemoSubCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoSubCategoryCommand, MemoSubCategoryDto>
{
    public async Task<MemoSubCategoryDto> Handle(UpdateMemoSubCategoryCommand request, CancellationToken ct)
    {
        var subCategory = await db.MemoSubCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoSubCategory", request.Id, "MEMO_SUB_CATEGORY_NOT_FOUND");

        var name = request.Name.Trim();

        if (await db.MemoSubCategories.AnyAsync(x =>
                x.Id != request.Id && x.MemoCategoryId == subCategory.MemoCategoryId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_SUB_CATEGORY", $"Sub-category '{name}' already exists in this category.");

        var oldName = subCategory.Name;
        subCategory.Name = name;
        subCategory.NameEn = Common.Helpers.NameText.Apply(subCategory.NameEn, request.NameEn);
        subCategory.NameId = Common.Helpers.NameText.Apply(subCategory.NameId, request.NameId);

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

        return new MemoSubCategoryDto(subCategory.Id, subCategory.MemoCategoryId, subCategory.Name, subCategory.IsActive, subCategory.NameEn, subCategory.NameId);
    }
}
