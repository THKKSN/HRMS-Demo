using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record CreateMemoCategoryCommand(Guid MemoTypeId, string Name, string? NameEn = null, string? NameId = null) : IRequest<MemoCategoryDto>;

public class CreateMemoCategoryValidator : AbstractValidator<CreateMemoCategoryCommand>
{
    public CreateMemoCategoryValidator()
    {
        RuleFor(x => x.MemoTypeId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
    }
}

public class CreateMemoCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateMemoCategoryCommand, MemoCategoryDto>
{
    public async Task<MemoCategoryDto> Handle(CreateMemoCategoryCommand request, CancellationToken ct)
    {
        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.MemoTypeId, ct)
            ?? throw new NotFoundException("MemoType", request.MemoTypeId, "MEMO_TYPE_NOT_FOUND");

        if (!memoType.IsActive)
            throw new ConflictException("MEMO_TYPE_INACTIVE", "This memo type is inactive.");

        var name = request.Name.Trim();

        if (await db.MemoCategories.AnyAsync(x =>
                x.MemoTypeId == request.MemoTypeId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_MEMO_CATEGORY", $"Category '{name}' already exists in this memo type.");

        var category = new MemoCategory
        {
            MemoTypeId = request.MemoTypeId,
            Name = name,
            NameEn = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId = Common.Helpers.NameText.Normalize(request.NameId),
            IsActive = true,
        };

        db.MemoCategories.Add(category);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoCategory",
            entityId:    category.Id.ToString(),
            action:      "create",
            description: $"สร้างหมวดหมู่ '{category.Name}' ในประเภทเรื่อง '{memoType.Name}'",
            oldValues:   null,
            newValues:   new { category.MemoTypeId, category.Name },
            ct:          ct);

        return new MemoCategoryDto(category.Id, category.MemoTypeId, category.Name, category.IsActive, category.NameEn, category.NameId);
    }
}
