using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record ToggleMemoTypeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleMemoTypeStatusHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<ToggleMemoTypeStatusCommand>
{
    public async Task Handle(ToggleMemoTypeStatusCommand request, CancellationToken ct)
    {
        var memoType = await db.MemoTypes.FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทเรื่อง");

        // ปิด MemoType ได้แม้มี Category/SubCategory ลูก active อยู่ — cascade dropdown query จะ filter
        // IsActive ของทุกชั้นอยู่แล้ว จึงไม่ต้องบล็อกตรงนี้ (พฤติกรรมตั้งใจ ตามแผน Phase 2 ข้อ 2.3)
        var oldIsActive = memoType.IsActive;
        memoType.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "MemoType",
            entityId:    memoType.Id.ToString(),
            action:      request.IsActive ? "activate" : "deactivate",
            description: $"{(request.IsActive ? "เปิด" : "ปิด")}ใช้งานประเภทเรื่อง '{memoType.Name}'",
            oldValues:   new { isActive = oldIsActive },
            newValues:   new { isActive = request.IsActive },
            ct:          ct);
    }
}
