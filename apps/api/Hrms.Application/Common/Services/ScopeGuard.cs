using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Services;

/// <summary>
/// กฎ scope:
///   Admin → เข้าได้ทุก company (system-wide)
///   HR ของ company X → เข้าได้ company X และ descendant ทั้งหมด
///   SchoolAdmin → เข้าได้เฉพาะ company ตัวเอง
/// </summary>
public class ScopeGuard(ICurrentUser currentUser, IApplicationDbContext db) : IScopeGuard
{
    public async Task<bool> CanAccessCompanyAsync(Guid companyId, CancellationToken ct = default)
    {
        if (!currentUser.IsAuthenticated) return false;

        // Admin → เข้าได้ทุก company เสมอ
        if (currentUser.Roles.Any(r => r.Role == RoleType.Admin.ToString()))
            return true;

        var hrCompanyIds = currentUser.Roles
            .Where(r => r.Role == RoleType.Hr.ToString() && r.CompanyId.HasValue)
            .Select(r => r.CompanyId!.Value)
            .ToHashSet();

        if (hrCompanyIds.Count == 0)
        {
            // SchoolAdmin / Supervisor → เฉพาะ company ตัวเอง
            return currentUser.Roles.Any(r =>
                r.CompanyId == companyId &&
                r.Role == RoleType.SchoolAdmin.ToString());
        }

        // HR: เช็คว่า targetCompany เป็น companyId ตรงๆ หรือ descendant ของ HR company
        if (hrCompanyIds.Contains(companyId)) return true;

        // โหลด company tree สำหรับ ancestor check
        var allCompanies = await db.Companies
            .Select(c => new { c.Id, c.ParentId })
            .ToListAsync(ct);

        var parentMap = allCompanies.ToDictionary(c => c.Id, c => c.ParentId);

        var current = companyId;
        while (parentMap.TryGetValue(current, out var parentId) && parentId.HasValue)
        {
            if (hrCompanyIds.Contains(parentId.Value)) return true;
            current = parentId.Value;
        }

        return false;
    }

    public async Task ThrowIfCannotAccessAsync(Guid companyId, CancellationToken ct = default)
    {
        if (!await CanAccessCompanyAsync(companyId, ct))
            throw new AppForbiddenException($"Access to company {companyId} is not permitted.");
    }
}
