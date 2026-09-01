using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record ToggleMemoCategoryStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleMemoCategoryStatusHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<ToggleMemoCategoryStatusCommand>
{
    public async Task Handle(ToggleMemoCategoryStatusCommand request, CancellationToken ct)
    {
        var category = await db.MemoCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหมวดหมู่");

        var oldIsActive = category.IsActive;
        category.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoCategory",
            entityId:    category.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานหมวดหมู่ '{category.Name}'",
            oldValues:   new { isActive = oldIsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);
    }
}
