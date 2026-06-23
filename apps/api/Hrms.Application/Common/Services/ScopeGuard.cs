using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Common.Services;

/// <summary>
/// กฎ scope:
///   Admin → เข้าได้ทุก company (system-wide)
///   HR ใน HQ company (IsHeadquarters = true) → เข้าได้ทุก company (system-wide)
///   HR ของ company X → เข้าได้ company X และ descendant ทั้งหมด
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
            // Supervisor / Employee → เฉพาะ company ตัวเอง
            return currentUser.CompanyId == companyId;
        }

        // HR ใน HQ company → เข้าได้ทุก company
        var isHqHr = await db.Companies
            .AnyAsync(c => hrCompanyIds.Contains(c.Id) && c.IsHeadquarters, ct);

        if (isHqHr) return true;

        // HR: เช็คว่า targetCompany เป็น companyId ตรงๆ หรือ descendant ของ HR company
        if (hrCompanyIds.Contains(companyId)) return true;

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
            throw new AppForbiddenException($"ไม่มีสิทธิ์เข้าถึงบริษัทนี้");
    }

    public async Task<IReadOnlySet<Guid>?> GetAccessibleCompanyIdsAsync(CancellationToken ct = default)
    {
        if (!currentUser.IsAuthenticated)
            return new HashSet<Guid>();

        // Admin → system-wide
        if (currentUser.Roles.Any(r => r.Role == RoleType.Admin.ToString()))
            return null;

        var hrCompanyIds = currentUser.Roles
            .Where(r => r.Role == RoleType.Hr.ToString() && r.CompanyId.HasValue)
            .Select(r => r.CompanyId!.Value)
            .ToHashSet();

        if (hrCompanyIds.Count == 0)
        {
            return currentUser.CompanyId.HasValue
                ? new HashSet<Guid> { currentUser.CompanyId.Value }
                : new HashSet<Guid>();
        }

        // HQ HR → system-wide
        var isHqHr = await db.Companies
            .AnyAsync(c => hrCompanyIds.Contains(c.Id) && c.IsHeadquarters, ct);
        if (isHqHr) return null;

        // HR ปกติ → company ของตัวเอง + descendants ทั้งหมด
        var allCompanies = await db.Companies
            .Select(c => new { c.Id, c.ParentId })
            .ToListAsync(ct);

        var result = new HashSet<Guid>(hrCompanyIds);
        bool changed;
        do
        {
            changed = false;
            foreach (var c in allCompanies)
            {
                if (!result.Contains(c.Id) && c.ParentId.HasValue && result.Contains(c.ParentId.Value))
                {
                    result.Add(c.Id);
                    changed = true;
                }
            }
        } while (changed);

        return result;
    }
}
