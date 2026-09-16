using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Services;

// ขอบเขตการ resolve ผู้มีสิทธิ์ เมื่อ config เป็น role + "All" (ไม่ระบุคน)
public enum MemoApproverScope
{
    // pool ทั้งระบบ — ใช้กับด่านอนุมัติแรก (พฤติกรรมเดิมของ Executive pool)
    SystemPool,
    // เฉพาะบริษัท/แผนกปลายทางของ MemoType — ใช้กับ step กลางทาง
    TargetOrg,
}

public record MemoNotifyRecipient(Guid EmployeeId, string LineUserId);

// ตัวกลางเช็คสิทธิ์/หา ผู้รับ notification ของด่านอนุมัติแรกและ step กลางทาง — ใช้กติกาเดียวกันทุกจุด
public interface IMemoStepAuthorizer
{
    Task<bool> CanActAsync(
        Guid employeeId, RoleType roleCode, Guid? assigneeEmployeeId,
        Guid targetCompanyId, Guid targetDepartmentId, MemoApproverScope scope, CancellationToken ct);

    Task<List<MemoNotifyRecipient>> ResolveRecipientsAsync(
        RoleType roleCode, Guid? assigneeEmployeeId,
        Guid targetCompanyId, Guid targetDepartmentId, MemoApproverScope scope, CancellationToken ct);
}

public class MemoStepAuthorizer(IApplicationDbContext db) : IMemoStepAuthorizer
{
    public async Task<bool> CanActAsync(
        Guid employeeId, RoleType roleCode, Guid? assigneeEmployeeId,
        Guid targetCompanyId, Guid targetDepartmentId, MemoApproverScope scope, CancellationToken ct)
    {
        // Admin ทำแทนได้เสมอ — escape hatch กรณีผู้รับผิดชอบลาออก/ไม่อยู่
        if (assigneeEmployeeId is { } specificId)
        {
            if (employeeId == specificId)
            {
                var stillEligible = await db.EmployeeRoles.AsNoTracking()
                    .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == roleCode, ct);
                if (stillEligible) return true;
            }
            return await IsAdminAsync(employeeId, ct);
        }

        if (scope == MemoApproverScope.SystemPool)
        {
            var inPool = await db.EmployeeRoles.AsNoTracking()
                .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == roleCode, ct);
            return inPool || await IsAdminAsync(employeeId, ct);
        }

        // TargetOrg: role scope ตรงบริษัทปลายทาง (department ตรง หรือ grant ระดับบริษัท)
        // หรือตัวพนักงานสังกัดบริษัทปลายทางเอง — Supervisor ต้องตรงแผนกด้วย role อื่น (เช่น Executive) แค่บริษัทตรง
        var inTargetOrg = await db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == roleCode &&
                ((er.CompanyId == targetCompanyId && (er.DepartmentId == null || er.DepartmentId == targetDepartmentId)) ||
                 (er.Employee.CompanyId == targetCompanyId &&
                  (roleCode != RoleType.Supervisor || er.Employee.DepartmentId == targetDepartmentId))), ct);
        return inTargetOrg || await IsAdminAsync(employeeId, ct);
    }

    public async Task<List<MemoNotifyRecipient>> ResolveRecipientsAsync(
        RoleType roleCode, Guid? assigneeEmployeeId,
        Guid targetCompanyId, Guid targetDepartmentId, MemoApproverScope scope, CancellationToken ct)
    {
        // เงื่อนไข match เดียวกับ CanActAsync (ยกเว้น Admin — ไม่ broadcast หา Admin)
        var query = db.EmployeeRoles.AsNoTracking()
            .Where(er => er.IsActive && er.Role.Code == roleCode && er.Employee.IsActive);

        if (assigneeEmployeeId is { } specificId)
            query = query.Where(er => er.EmployeeId == specificId);
        else if (scope == MemoApproverScope.TargetOrg)
            query = query.Where(er =>
                (er.CompanyId == targetCompanyId && (er.DepartmentId == null || er.DepartmentId == targetDepartmentId)) ||
                (er.Employee.CompanyId == targetCompanyId &&
                 (roleCode != RoleType.Supervisor || er.Employee.DepartmentId == targetDepartmentId)));

        var rows = await query
            .Select(er => new { er.EmployeeId, er.Employee.LineUserId })
            .Where(x => x.LineUserId != null && x.LineUserId != "")
            .Distinct()
            .ToListAsync(ct);

        return rows.Select(x => new MemoNotifyRecipient(x.EmployeeId, x.LineUserId!)).ToList();
    }

    private Task<bool> IsAdminAsync(Guid employeeId, CancellationToken ct)
        => db.EmployeeRoles.AsNoTracking()
            .AnyAsync(er => er.EmployeeId == employeeId && er.IsActive && er.Role.Code == RoleType.Admin, ct);
}
