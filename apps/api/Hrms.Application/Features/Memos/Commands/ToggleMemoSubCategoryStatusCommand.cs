using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record ToggleMemoSubCategoryStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleMemoSubCategoryStatusHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<ToggleMemoSubCategoryStatusCommand>
{
    public async Task Handle(ToggleMemoSubCategoryStatusCommand request, CancellationToken ct)
    {
        var subCategory = await db.MemoSubCategories.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบหัวข้อย่อย");

        var oldIsActive = subCategory.IsActive;
        subCategory.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoSubCategory",
            entityId:    subCategory.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานหัวข้อย่อย '{subCategory.Name}'",
            oldValues:   new { isActive = oldIsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);
    }
}
