using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Commands;

public record ReceiveMemoCommand(Guid Id) : IRequest<MemoDto>;

public class ReceiveMemoHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IAuditLogService auditLog)
    : IRequestHandler<ReceiveMemoCommand, MemoDto>
{
    public async Task<MemoDto> Handle(ReceiveMemoCommand request, CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.ApprovedByEmployee)
            .Include(x => x.AcknowledgedByEmployee)
            .Include(x => x.DeliveredByEmployee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        // เฉพาะผู้ขอต้นเรื่องเท่านั้นที่ยืนยันตรวจรับ/จบงานได้
        if (memo.RequesterId != employeeId)
            throw new AppForbiddenException("MEMO_RECEIVE_REQUESTER_ONLY", "Only the original requester can confirm receipt.");

        if (memo.DeliveredAt is null)
            throw new ConflictException("MEMO_NOT_DELIVERED", "Only delivered memos can be confirmed as received.");

        if (memo.ReceivedAt is not null)
            throw new ConflictException("MEMO_ALREADY_RECEIVED", "This memo has already been confirmed as received.");

        memo.ReceivedAt = DateTime.UtcNow.AddHours(7);
        memo.ReceivedByEmployeeId = employeeId;

        await db.SaveChangesAsync(ct);

        var memoTitle = $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";
        await auditLog.LogAsync(
            module:      "memo",
            entityType:  "Memo",
            entityId:    memo.Id.ToString(),
            action:      "receive",
            description: $"ยืนยันตรวจรับ/จบงานเรื่อง '{memoTitle}'",
            oldValues:   null,
            newValues:   new { memo.ReceivedAt, memo.ReceivedByEmployeeId },
            ct:          ct);

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt, memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.ApproveComment,
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt, memo.AcknowledgedByEmployee is null ? null : FullName(memo.AcknowledgedByEmployee),
            memo.DeliveredAt, memo.DeliveredByEmployee is null ? null : FullName(memo.DeliveredByEmployee),
            memo.ReceivedAt, FullName(memo.Requester),
            memo.CreatedAt);
    }

    private static string FullName(Domain.Entities.Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
