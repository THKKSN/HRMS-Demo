using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record UpdateMemoCategoryCommand(Guid Id, string Name, string? NameEn = null, string? NameId = null) : IRequest<MemoCategoryDto>;

public class UpdateMemoCategoryValidator : AbstractValidator<UpdateMemoCategoryCommand>
{
    public UpdateMemoCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
    }
}

public class UpdateMemoCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoCategoryCommand, MemoCategoryDto>
{
    public async Task<MemoCategoryDto> Handle(UpdateMemoCategoryCommand request, CancellationToken ct)
    {
        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("MemoCategory", request.Id, "MEMO_CATEGORY_NOT_FOUND");

        var name = request.Name.Trim();

        if (await db.MemoCategories.AnyAsync(x =>
                x.Id != request.Id && x.MemoTypeId == category.MemoTypeId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_CATEGORY", $"Category '{name}' already exists in this memo type.");

        var oldName = category.Name;
        category.Name = name;
        category.NameEn = Common.Helpers.NameText.Apply(category.NameEn, request.NameEn);
        category.NameId = Common.Helpers.NameText.Apply(category.NameId, request.NameId);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoCategory",
            entityId:    category.Id.ToString(),
            action:      "update",
            description: $"แก้ไขหมวดหมู่ '{oldName}' เป็น '{category.Name}'",
            oldValues:   new { Name = oldName },
            newValues:   new { category.Name },
            ct:          ct);

        return new MemoCategoryDto(category.Id, category.MemoTypeId, category.Name, category.IsActive, category.NameEn, category.NameId);
    }
}
