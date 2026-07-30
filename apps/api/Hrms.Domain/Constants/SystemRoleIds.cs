using Hrms.Domain.Enums;

namespace Hrms.Domain.Constants;

public static class SystemRoleIds
{
    public static readonly Guid Employee = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid Supervisor = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid Hr = Guid.Parse("10000000-0000-0000-0000-000000000003");
    public static readonly Guid SchoolAdmin = Guid.Parse("10000000-0000-0000-0000-000000000004");
    public static readonly Guid Executive = Guid.Parse("10000000-0000-0000-0000-000000000005");
    public static readonly Guid Admin = Guid.Parse("10000000-0000-0000-0000-000000000006");

    public static Guid FromCode(RoleType code) => code switch
    {
        RoleType.Employee => Employee,
        RoleType.Supervisor => Supervisor,
        RoleType.Hr => Hr,
        RoleType.SchoolAdmin => SchoolAdmin,
        RoleType.Executive => Executive,
        RoleType.Admin => Admin,
        _ => throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown system role.")
    };

    public static RoleType ToCode(Guid id)
    {
        if (id == Employee) return RoleType.Employee;
        if (id == Supervisor) return RoleType.Supervisor;
        if (id == Hr) return RoleType.Hr;
        if (id == SchoolAdmin) return RoleType.SchoolAdmin;
        if (id == Executive) return RoleType.Executive;
        if (id == Admin) return RoleType.Admin;
        throw new ArgumentOutOfRangeException(nameof(id), id, "Unknown system role ID.");
    }
}
