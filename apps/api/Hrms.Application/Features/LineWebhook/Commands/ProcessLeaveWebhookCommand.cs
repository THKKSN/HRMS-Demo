using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LineWebhook.Commands;

public record ProcessLeaveWebhookCommand(
    Guid LeaveId,
    string LineUserId,
    string Action) : IRequest<Unit>;

public class ProcessLeaveWebhookHandler(
    IApplicationDbContext db,
    ILineMessagingService line,
    ILeaveNotificationService notification)
    : IRequestHandler<ProcessLeaveWebhookCommand, Unit>
{
    public async Task<Unit> Handle(ProcessLeaveWebhookCommand request, CancellationToken ct)
    {
        try
        {
            // ระบุ actor จาก LINE userId
            var actor = await db.Employees
                .Include(e => e.Roles.Where(r => r.IsActive))
                .FirstOrDefaultAsync(e => e.LineUserId == request.LineUserId && e.IsActive, ct);

            if (actor is null)
            {
                await PushAsync(request.LineUserId, "ไม่พบข้อมูลผู้ใช้ในระบบ", ct);
                return Unit.Value;
            }

            var leave = await db.LeaveRequests
                .Include(r => r.Employee)
                .Include(r => r.LeaveType)
                .FirstOrDefaultAsync(r => r.Id == request.LeaveId, ct);

            if (leave is null)
            {
                await PushAsync(request.LineUserId, "ไม่พบคำขอลาที่ระบุ", ct);
                return Unit.Value;
            }

            var now = DateTime.UtcNow;
            var action = request.Action.ToLowerInvariant();

            switch (leave.Status)
            {
                case LeaveStatus.PendingSupervisor:
                {
                    var isSupervisor = actor.Roles.Any(r =>
                        r.Role == RoleType.Supervisor || r.Role == RoleType.Hr ||
                        r.Role == RoleType.Admin || r.Role == RoleType.Executive);

                    if (!isSupervisor)
                    {
                        await PushAsync(request.LineUserId, "คุณไม่มีสิทธิ์ดำเนินการนี้", ct);
                        return Unit.Value;
                    }

                    if (action == "approve")
                    {
                        leave.Status             = LeaveStatus.PendingHr;
                        leave.SupervisorId       = actor.Id;
                        leave.SupervisorApprovedAt = now;
                        await db.SaveChangesAsync(ct);
                        await notification.EnqueueApprovalPendingAsync(leave.Id);
                        await PushAsync(request.LineUserId, $"✅ อนุมัติขั้นต้นแล้ว — รอ HR ยืนยัน", ct);
                    }
                    else
                    {
                        leave.Status           = LeaveStatus.Rejected;
                        leave.SupervisorId     = actor.Id;
                        leave.UpdatedAt        = now;
                        await ReturnPendingDaysAsync(leave, ct);
                        await db.SaveChangesAsync(ct);
                        await notification.EnqueueResultAsync(leave.Id);
                        await PushAsync(request.LineUserId, "❌ ปฏิเสธแล้ว", ct);
                    }
                    break;
                }

                case LeaveStatus.PendingHr:
                {
                    var isHr = actor.Roles.Any(r =>
                        r.Role == RoleType.Hr || r.Role == RoleType.Admin);

                    if (!isHr)
                    {
                        await PushAsync(request.LineUserId, "คุณไม่มีสิทธิ์ดำเนินการนี้", ct);
                        return Unit.Value;
                    }

                    if (action == "approve")
                    {
                        leave.Status      = LeaveStatus.Approved;
                        leave.HrId        = actor.Id;
                        leave.HrApprovedAt = now;
                        leave.UpdatedAt   = now;

                        var balance = await db.LeaveBalances.FirstOrDefaultAsync(b =>
                            b.EmployeeId  == leave.EmployeeId &&
                            b.LeaveTypeId == leave.LeaveTypeId &&
                            b.Year        == leave.DateFrom.Year, ct);

                        if (balance is not null)
                        {
                            balance.UsedDays    += leave.TotalDays;
                            balance.PendingDays -= leave.TotalDays;
                        }

                        await db.SaveChangesAsync(ct);
                        await notification.EnqueueResultAsync(leave.Id);
                        await PushAsync(request.LineUserId, "✅ อนุมัติแล้ว", ct);
                    }
                    else
                    {
                        leave.Status    = LeaveStatus.Rejected;
                        leave.HrId      = actor.Id;
                        leave.UpdatedAt = now;
                        await ReturnPendingDaysAsync(leave, ct);
                        await db.SaveChangesAsync(ct);
                        await notification.EnqueueResultAsync(leave.Id);
                        await PushAsync(request.LineUserId, "❌ ปฏิเสธแล้ว", ct);
                    }
                    break;
                }

                default:
                    await PushAsync(request.LineUserId, "คำขอนี้ไม่อยู่ในสถานะรออนุมัติ", ct);
                    break;
            }
        }
        catch
        {
            // ไม่ให้ exception หลุดออกนอก — LINE webhook ต้องการ 200 เสมอ
        }

        return Unit.Value;
    }

    private async Task ReturnPendingDaysAsync(Domain.Entities.LeaveRequest leave, CancellationToken ct)
    {
        var balance = await db.LeaveBalances.FirstOrDefaultAsync(b =>
            b.EmployeeId  == leave.EmployeeId &&
            b.LeaveTypeId == leave.LeaveTypeId &&
            b.Year        == leave.DateFrom.Year, ct);

        if (balance is not null)
            balance.PendingDays -= leave.TotalDays;
    }

    private async Task PushAsync(string lineUserId, string message, CancellationToken ct)
    {
        try { await line.PushMessageAsync(lineUserId, message, ct); }
        catch { /* เงียบๆ ถ้า push ไม่ได้ */ }
    }
}
