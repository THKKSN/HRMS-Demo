using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;

namespace Hrms.Application.Common.Services;

/// <summary>
/// กฎ scope:
///   Admin / HR ที่ CompanyId = null ใน JWT → เห็นทุก company (Central)
///   Admin / HR ที่ CompanyId = X → เห็นเฉพาะ company X
///   SchoolAdmin → เห็นเฉพาะ company ที่ผูกอยู่ (ICurrentUser.CompanyId)
///   Supervisor / Employee → ใช้ scope ของ company ตัวเอง
/// </summary>
public class ScopeGuard(ICurrentUser currentUser) : IScopeGuard
{
    public bool CanAccessCompany(Guid companyId)
    {
        if (!currentUser.IsAuthenticated) return false;

        // Admin / HR ที่ไม่ผูก company (Central) → เข้าได้ทุกที่
        if (currentUser.Roles.Any(r =>
                (r.Role == RoleType.Admin.ToString() || r.Role == RoleType.Hr.ToString()) &&
                r.CompanyId == null))
            return true;

        // Admin / HR / SchoolAdmin ที่ผูก company → เช็คตรงๆ
        return currentUser.Roles.Any(r =>
            r.CompanyId == companyId &&
            (r.Role == RoleType.Admin.ToString() ||
             r.Role == RoleType.Hr.ToString() ||
             r.Role == RoleType.SchoolAdmin.ToString()));
    }

    public void ThrowIfCannotAccess(Guid companyId)
    {
        if (!CanAccessCompany(companyId))
            throw new AppForbiddenException($"Access to company {companyId} is not permitted.");
    }
}
