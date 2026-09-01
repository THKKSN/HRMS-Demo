using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record UpdateMemoCategoryCommand(Guid Id, string Name) : IRequest<MemoCategoryDto>;

public class UpdateMemoCategoryValidator : AbstractValidator<UpdateMemoCategoryCommand>
{
    public UpdateMemoCategoryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class UpdateMemoCategoryHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<UpdateMemoCategoryCommand, MemoCategoryDto>
{
    public async Task<MemoCategoryDto> Handle(UpdateMemoCategoryCommand request, CancellationToken ct)
    {
        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดหมู่");

        var name = request.Name.Trim();

        if (await db.MemoCategories.AnyAsync(x =>
                x.Id != request.Id && x.MemoTypeId == category.MemoTypeId && x.Name == name && x.IsActive, ct))
            throw new ConflictException("DUPLICATE_NAME", $"หมวดหมู่ '{name}' มีอยู่แล้วในประเภทเรื่องนี้");

        var oldName = category.Name;
        category.Name = name;

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

        return new MemoCategoryDto(category.Id, category.MemoTypeId, category.Name, category.IsActive);
    }
}
