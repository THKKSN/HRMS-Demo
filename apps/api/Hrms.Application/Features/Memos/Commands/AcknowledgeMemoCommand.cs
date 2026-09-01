using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record AcknowledgeMemoCommand(Guid Id) : IRequest<MemoDto>;

public class AcknowledgeMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog)
    : IRequestHandler<AcknowledgeMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(AcknowledgeMemoCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:view-inbox", ct);

        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้ใช้");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.ApprovedByEmployee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_NOT_APPROVED", "รับทราบได้เฉพาะเรื่องที่อนุมัติแล้วเท่านั้น");

        if (memo.AcknowledgedAt is not null)
            throw new ConflictException("MEMO_ALREADY_ACKNOWLEDGED", "เรื่องนี้ถูกรับทราบไปแล้ว");

        // เฉพาะ Supervisor ของแผนกปลายทาง — role scope ตรง หรือตัวพนักงานสังกัดแผนกปลายทางนั้นเอง
        var canAcknowledge = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive &&
                er.Role.Code == RoleType.Supervisor &&
                ((er.CompanyId == memo.MemoType.CompanyId && er.DepartmentId == memo.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == memo.MemoType.CompanyId && er.Employee.DepartmentId == memo.MemoType.DepartmentId)), ct);
        if (!canAcknowledge)
            throw new AppForbiddenException("ไม่มีสิทธิ์รับทราบเรื่องนี้ — ต้องเป็นหัวหน้าแผนกปลายทางเท่านั้น");

        memo.AcknowledgedAt = DateTime.UtcNow.AddHours(7);
        memo.AcknowledgedByEmployeeId = employeeId;

        await db.SaveChangesAsync(ct);

        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";
        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "acknowledge",
            description: $"รับทราบเรื่อง '{memoTitle}'",
            oldValues:   null,
            newValues:   new { memo.AcknowledgedAt, memo.AcknowledgedByEmployeeId },
            ct:          ct);

        var acknowledger = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt, acknowledger is null ? null : FullName(acknowledger),
            null, null, null, null,
            memo.CreatedAt);
    }

    private static string FullName(Domain.Entities.Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
