namespace Hrms.Application.Common.Interfaces;

public interface IScopeGuard
{
    /// <summary>คืน true ถ้า user ปัจจุบันมีสิทธิ์เข้าถึง company นั้น</summary>
    bool CanAccessCompany(Guid companyId);

    /// <summary>Throw AppForbiddenException ถ้าเข้าไม่ได้</summary>
    void ThrowIfCannotAccess(Guid companyId);
}
