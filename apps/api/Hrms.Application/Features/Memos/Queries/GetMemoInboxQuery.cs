using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

// includeDelivered = true → คืนทั้งที่ส่งมอบแล้วด้วย (สำหรับ filter ดูประวัติ) — default คืนเฉพาะที่ยังไม่ส่งมอบ
// รวมเรื่อง Pending (รอ Executive อนุมัติ) ด้วย เพื่อให้แผนกปลายทางเห็นงานที่กำลังจะเข้ามาและเตรียมการล่วงหน้า
// (แจ้งเตือน LINE เฉพาะตอน Approved เท่านั้น — Pending แสดงเงียบๆ ในหน้านี้)
public record GetMemoInboxQuery(bool IncludeDelivered) : IRequest<IReadOnlyList<MemoInboxItemDto>>;

public class GetMemoInboxHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService)
    : IRequestHandler<GetMemoInboxQuery, IReadOnlyList<MemoInboxItemDto>>
{
    public async Task<IReadOnlyList<MemoInboxItemDto>> Handle(GetMemoInboxQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "memo:view-inbox", ct);

        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("ไม่พบตัวตนผู้ใช้");

        var isSupervisor = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Supervisor, ct);
        if (!isSupervisor)
            throw new AppForbiddenException("เฉพาะหัวหน้าแผนก (Supervisor) เท่านั้นที่เข้าถึงหน้านี้ได้");

        // Supervisor เห็นเรื่องของแผนกปลายทาง (MemoType.CompanyId/DepartmentId) เมื่อ:
        // - role Supervisor ถูก scope ตรงกับปลายทาง หรือ
        // - ตัวพนักงานเองสังกัด Company/Department ปลายทางนั้น (กรณี role ไม่ได้ scope แผนก)
        var query = db.Memos.AsNoTracking()
            .Where(x => x.Status == MemoStatus.Approved || x.Status == MemoStatus.Pending)
            .Where(x => db.EmployeeRoles.Any(er =>
                er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Supervisor &&
                ((er.CompanyId == x.MemoType.CompanyId && er.DepartmentId == x.MemoType.DepartmentId) ||
                 (er.Employee.CompanyId == x.MemoType.CompanyId && er.Employee.DepartmentId == x.MemoType.DepartmentId))));

        if (!request.IncludeDelivered)
            query = query.Where(x => x.DeliveredAt == null);

        return await query
            .OrderByDescending(x => x.ApprovedAt ?? x.CreatedAt)
            .Select(x => new MemoInboxItemDto(
                x.Id, x.MemoNo, x.MemoType.Name, x.MemoCategoryNameSnapshot, x.MemoSubCategoryNameSnapshot,
                x.Detail, x.RequesterId, x.Requester.FirstName + " " + x.Requester.LastName,
                x.Company.Name, x.Department.Name,
                x.Status,
                x.ApprovedAt, x.AcknowledgedAt,
                x.AcknowledgedByEmployee == null ? null : x.AcknowledgedByEmployee.FirstName + " " + x.AcknowledgedByEmployee.LastName,
                x.DeliveredAt,
                x.DeliveredByEmployee == null ? null : x.DeliveredByEmployee.FirstName + " " + x.DeliveredByEmployee.LastName,
                x.ReceivedAt,
                x.CreatedAt))
            .ToListAsync(ct);
    }
}
