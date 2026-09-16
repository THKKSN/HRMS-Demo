using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

public record GetTicketPendingCountsQuery : IRequest<TicketPendingCountsDto>;

// Predicate แต่ละก้อนต้องตรงกับ query ของหน้ารายการที่ badge ลิงก์ไป
// (GetAssignedTicketsQuery / GetClaimableTicketsQuery / GetMyTicketsQuery /
//  GetTicketInboxQuery / GetPendingTicketCancellationsQuery / GetMemoInboxQuery / GetMemosForApprovalQuery)
// เพื่อไม่ให้ตัวเลขบนการ์ดไม่ตรงกับจำนวนแถวที่ผู้ใช้เห็นจริง
public class GetTicketPendingCountsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions,
    Memos.Services.IMemoStepTaskResolver stepTasks)
    : IRequestHandler<GetTicketPendingCountsQuery, TicketPendingCountsDto>
{
    public async Task<TicketPendingCountsDto> Handle(GetTicketPendingCountsQuery request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        int? assignedActive = null, assignedWaitingInfo = null, claimable = null;
        if (await permissions.HasPermissionAsync(currentUser, "ticket:view-assigned", ct))
        {
            // นับทั้งงานที่เป็นผู้รับผิดชอบหลักและงานที่ร่วมทีม — badge ต้องตรงกับรายการที่กดเข้าไปเห็น
            var myActiveAssignments = db.TicketAssignments.AsNoTracking().Where(a =>
                a.AssignedToEmployeeId == employeeId && a.IsActive);
            assignedActive = await myActiveAssignments.CountAsync(a =>
                a.Ticket.Status == TicketStatus.Assigned ||
                a.Ticket.Status == TicketStatus.InProgress, ct);
            assignedWaitingInfo = await myActiveAssignments.CountAsync(a =>
                a.Ticket.Status == TicketStatus.WaitingInfo, ct);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
            claimable = await db.Tickets.AsNoTracking().CountAsync(t =>
                t.Status == TicketStatus.Open &&
                !t.Assignments.Any(a => a.IsActive && a.IsPrimary) &&
                db.EmployeeResponsibilities.Any(r =>
                    r.EmployeeId == employeeId && r.CompanyId == t.TargetCompanyId &&
                    r.DepartmentId == t.TargetDepartmentId && r.CategoryId == t.CategoryId!.Value &&
                    (r.TopicId == null || r.TopicId == t.TopicId) && r.IsActive &&
                    (!r.EffectiveFrom.HasValue || r.EffectiveFrom.Value <= today) &&
                    (!r.EffectiveTo.HasValue || r.EffectiveTo.Value >= today) &&
                    r.Employee.IsActive && r.Employee.CompanyId == t.TargetCompanyId &&
                    r.Employee.DepartmentId == t.TargetDepartmentId), ct);
        }

        int? myOpen = null, awaitingMyConfirmation = null;
        if (await permissions.HasPermissionAsync(currentUser, "ticket:view-own", ct))
        {
            var mine = db.Tickets.AsNoTracking().Where(t => t.RequesterEmployeeId == employeeId);
            myOpen = await mine.CountAsync(t =>
                t.Status != TicketStatus.Closed &&
                t.Status != TicketStatus.Rejected &&
                t.Status != TicketStatus.Cancelled, ct);
            awaitingMyConfirmation = await mine.CountAsync(t =>
                t.Status == TicketStatus.AwaitingRequesterConfirmation, ct);
        }

        int? inboxUntriaged = null, cancellationPending = null;
        if (await permissions.HasPermissionAsync(currentUser, "ticket:view-team", ct))
        {
            var scope = TicketSupervisorAccess.ApplyDepartmentScope(db.Tickets.AsNoTracking(), currentUser, db);
            inboxUntriaged = await scope.CountAsync(t => t.Status == TicketStatus.Open, ct);
            cancellationPending = await db.TicketCancellationRequests.AsNoTracking().CountAsync(c =>
                c.Status == TicketCancellationStatus.Pending &&
                scope.Any(t => t.Id == c.TicketId), ct);
        }

        int? memoAwaitingAck = null;
        if (await permissions.HasPermissionAsync(currentUser, "memo:view-inbox", ct) &&
            await db.EmployeeRoles.AsNoTracking().AnyAsync(er =>
                er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Supervisor, ct))
        {
            memoAwaitingAck = await db.Memos.AsNoTracking()
                .Where(x => x.Status == MemoStatus.Approved || x.Status == MemoStatus.Pending)
                .Where(x => x.DeliveredAt == null && x.AcknowledgedAt == null)
                .CountAsync(x => db.EmployeeRoles.Any(er =>
                    er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Supervisor &&
                    ((er.CompanyId == x.MemoType.CompanyId && er.DepartmentId == x.MemoType.DepartmentId) ||
                     (er.Employee.CompanyId == x.MemoType.CompanyId && er.Employee.DepartmentId == x.MemoType.DepartmentId))), ct);
        }

        int? memoAwaitingApproval = null;
        if (await permissions.HasPermissionAsync(currentUser, "memo:approve", ct))
        {
            // ต้องกรองแบบเดียวกับ GetMemosForApprovalQuery — เห็นเฉพาะเรื่องที่ตัวเองเป็นผู้อนุมัติ
            // ตาม snapshot ของเรื่อง (ระบุคน = ตรงคน, ไม่ระบุ = ถือ role นั้นอยู่) ยกเว้น Admin ที่เห็นทุกเรื่อง
            var roleCodes = await db.EmployeeRoles.AsNoTracking()
                .Where(er => er.EmployeeId == employeeId && er.IsActive)
                .Select(er => er.Role.Code)
                .Distinct()
                .ToListAsync(ct);

            var pending = db.Memos.AsNoTracking().Where(x => x.Status == MemoStatus.Pending);
            if (!roleCodes.Contains(RoleType.Admin))
                pending = pending.Where(x =>
                    (x.FirstApproverEmployeeIdSnapshot == null || x.FirstApproverEmployeeIdSnapshot == employeeId) &&
                    roleCodes.Contains(x.FirstApproverRoleCodeSnapshot));

            memoAwaitingApproval = await pending.CountAsync(ct);
        }

        // ไม่มี permission gate — ผู้รับผิดชอบขั้นตอนถูกปักหมุดข้ามแผนกได้ ใครก็อาจมีงานค้าง
        var memoStepTasks = (await stepTasks.ResolveAsync(employeeId, ct)).Count;

        return new TicketPendingCountsDto(
            assignedActive,
            assignedWaitingInfo,
            claimable,
            myOpen,
            awaitingMyConfirmation,
            inboxUntriaged,
            cancellationPending,
            memoAwaitingAck,
            memoAwaitingApproval,
            memoStepTasks);
    }
}
