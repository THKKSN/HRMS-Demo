using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MemoReports;

public static class MemoReportAccess
{
    /// <summary>
    /// จำกัดขอบเขต Memo ที่ผู้เรียกเห็นได้ในรายงาน — ไม่สร้าง permission code ใหม่
    /// เพื่อไม่ต้อง seed permission เพิ่มบน production ใช้สิทธิ์ที่มีอยู่แล้วของแต่ละบทบาทแทน
    /// </summary>
    public static async Task<IQueryable<Memo>> ApplyScopeAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        CancellationToken ct)
    {
        if (currentUser.EmployeeId is not { } employeeId)
            throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND", "Current user has no employee record.");

        var canApprove = await permissions.HasPermissionAsync(currentUser, "memo:approve", ct);
        var canViewInbox = await permissions.HasPermissionAsync(currentUser, "memo:view-inbox", ct);
        if (!canApprove && !canViewInbox)
            throw new AppForbiddenException("MEMO_REPORT_FORBIDDEN", "You are not allowed to view the memo overview.");

        var query = db.Memos.AsNoTracking();

        // Executive = กลุ่มบริหารชุดเดียวกันทุกบริษัท เห็นภาพรวมทั้งหมดเหมือน Admin
        // (หลักการเดียวกับรายงาน ticket — ไม่ผูก ManagedCompanyIds)
        if (currentUser.HasRole(RoleType.Admin) || currentUser.HasRole(RoleType.Executive))
            return query;

        // Supervisor เห็นเฉพาะเรื่องที่ส่งเข้าแผนกปลายทางของตัวเอง — เงื่อนไขเดียวกับ GetMemoInboxQuery
        // เพื่อให้ตัวเลขบน dashboard ตรงกับรายการที่เปิดดูได้จริงในหน้า "Memo แผนก"
        return query.Where(x => db.EmployeeRoles.Any(er =>
            er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Supervisor &&
            ((er.CompanyId == x.MemoType.CompanyId && er.DepartmentId == x.MemoType.DepartmentId) ||
             (er.Employee.CompanyId == x.MemoType.CompanyId && er.Employee.DepartmentId == x.MemoType.DepartmentId))));
    }

    public static IQueryable<Memo> ApplyFilters(IQueryable<Memo> query, MemoReportFilter filter)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var dateFrom = filter.DateFrom ?? DateOnly.FromDateTime(now.AddDays(-30));
        var dateTo = filter.DateTo ?? DateOnly.FromDateTime(now);
        if (dateTo < dateFrom)
            throw new BadRequestException("DATE_RANGE_INVALID", "The end date must not be earlier than the start date.");
        if (dateTo.DayNumber - dateFrom.DayNumber > 366)
            throw new BadRequestException("REPORT_RANGE_TOO_LONG", "The report date range must not exceed one year.");

        var from = dateFrom.ToDateTime(TimeOnly.MinValue);
        var toExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue);
        query = query.Where(x => x.CreatedAt >= from && x.CreatedAt < toExclusive);

        if (filter.CompanyId is { } companyId)
            query = query.Where(x => x.MemoType.CompanyId == companyId);

        return query;
    }

    public static MemoReportMetaDto Meta(MemoReportFilter filter, ICurrentUser currentUser)
    {
        var now = DateTime.UtcNow.AddHours(7);
        return new MemoReportMetaDto(
            filter.DateFrom ?? DateOnly.FromDateTime(now.AddDays(-30)),
            filter.DateTo ?? DateOnly.FromDateTime(now),
            "Asia/Bangkok",
            currentUser.HasRole(RoleType.Admin) || currentUser.HasRole(RoleType.Executive)
                ? "All"
                : "SupervisorScope");
    }
}
