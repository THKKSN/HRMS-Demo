using BC = BCrypt.Net.BCrypt;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Persistence;

public class DataSeeder(HrmsDbContext db, ILogger<DataSeeder> logger)
{
    // Fixed GUIDs so re-runs stay idempotent
    private static readonly Guid CompanyId    = new("3fa85f64-5717-4562-b3fc-2c963f66a001");
    private static readonly Guid DeptHrId     = new("3fa85f64-5717-4562-b3fc-2c963f66a002");
    private static readonly Guid DeptItId     = new("3fa85f64-5717-4562-b3fc-2c963f66a013");
    private static readonly Guid LeaveTypeAL  = new("3fa85f64-5717-4562-b3fc-2c963f66a003");
    private static readonly Guid LeaveTypeSL  = new("3fa85f64-5717-4562-b3fc-2c963f66a011");
    private static readonly Guid LeaveTypePL  = new("3fa85f64-5717-4562-b3fc-2c963f66a012");
    // EMP001 — สมชาย ทดสอบ (HR)
    private static readonly Guid EmployeeId   = new("3fa85f64-5717-4562-b3fc-2c963f66a004");
    private static readonly Guid RoleId       = new("3fa85f64-5717-4562-b3fc-2c963f66a005");
    private static readonly Guid BalanceId    = new("3fa85f64-5717-4562-b3fc-2c963f66a006");
    // EMP002 — สมหญิง รักงาน (Employee)
    private static readonly Guid Employee2Id  = new("3fa85f64-5717-4562-b3fc-2c963f66a007");
    private static readonly Guid Role2Id      = new("3fa85f64-5717-4562-b3fc-2c963f66a008");
    // EMP003 — วิชัย ผู้จัดการ (Supervisor)
    private static readonly Guid Employee3Id  = new("3fa85f64-5717-4562-b3fc-2c963f66a009");
    private static readonly Guid Role3Id      = new("3fa85f64-5717-4562-b3fc-2c963f66a010");

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedCompanyAsync(ct);
        await SeedDepartmentAsync(ct);
        await SeedLeaveTypeAsync(ct);
        await SeedEmployeeAsync(ct);
        await SeedEmployeeRoleAsync(ct);
        await SeedLeaveBalanceAsync(ct);
        logger.LogInformation("Seed data complete.");
    }

    private async Task SeedCompanyAsync(CancellationToken ct)
    {
        if (await db.Companies.AnyAsync(x => x.Id == CompanyId, ct)) return;
        db.Companies.Add(new Company
        {
            Id = CompanyId,
            Name = "บริษัท เทสระบบ จำกัด",
            NameEn = "Test System Co., Ltd.",
            OrgType = OrgType.Holding,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }

    private async Task SeedDepartmentAsync(CancellationToken ct)
    {
        if (!await db.Departments.AnyAsync(x => x.Id == DeptHrId, ct))
        {
            db.Departments.Add(new Department
            {
                Id = DeptHrId,
                CompanyId = CompanyId,
                Name = "ฝ่ายทรัพยากรบุคคล",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        if (!await db.Departments.AnyAsync(x => x.Id == DeptItId, ct))
        {
            db.Departments.Add(new Department
            {
                Id = DeptItId,
                CompanyId = CompanyId,
                Name = "ฝ่ายเทคโนโลยีสารสนเทศ",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task SeedLeaveTypeAsync(CancellationToken ct)
    {
        var leaveTypes = new[]
        {
            new LeaveType { Id = LeaveTypeAL, Code = "AL", NameTh = "ลาพักร้อน",  NameEn = "Annual Leave",   DefaultDaysPerYear = 10, RequiresAttachment = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LeaveType { Id = LeaveTypeSL, Code = "SL", NameTh = "ลาป่วย",      NameEn = "Sick Leave",     DefaultDaysPerYear = 30, RequiresAttachment = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LeaveType { Id = LeaveTypePL, Code = "PL", NameTh = "ลากิจ",       NameEn = "Personal Leave", DefaultDaysPerYear = 3,  RequiresAttachment = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
        };
        var existingIds = await db.LeaveTypes.Where(lt => leaveTypes.Select(x => x.Id).Contains(lt.Id)).Select(lt => lt.Id).ToListAsync(ct);
        db.LeaveTypes.AddRange(leaveTypes.Where(lt => !existingIds.Contains(lt.Id)));
        await db.SaveChangesAsync(ct);
    }

    private async Task SeedEmployeeAsync(CancellationToken ct)
    {
        // EMP001 — สมชาย ทดสอบ (HR)
        var emp1 = await db.Employees.FirstOrDefaultAsync(x => x.Id == EmployeeId, ct);
        if (emp1 == null)
        {
            db.Employees.Add(new Employee
            {
                Id = EmployeeId, CompanyId = CompanyId, DepartmentId = DeptHrId,
                EmployeeCode = "EMP001", FirstName = "สมชาย", LastName = "ทดสอบ",
                Email = "emp001@test.com", NationalId = "1100100000001",
                PasswordHash = BC.HashPassword("Test@1234", workFactor: 12),
                HireDate = new DateOnly(2023, 1, 1), IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }
        else if (emp1.PasswordHash == null)
        {
            emp1.Email = "emp001@test.com";
            emp1.PasswordHash = BC.HashPassword("Test@1234", workFactor: 12);
            emp1.UpdatedAt = DateTime.UtcNow;
        }

        // EMP002 — สมหญิง รักงาน (Employee ทั่วไป)
        if (!await db.Employees.AnyAsync(x => x.Id == Employee2Id, ct))
        {
            db.Employees.Add(new Employee
            {
                Id = Employee2Id, CompanyId = CompanyId, DepartmentId = DeptItId,
                EmployeeCode = "EMP002", FirstName = "สมหญิง", LastName = "รักงาน",
                Email = "emp002@test.com", NationalId = "1100100000002",
                PasswordHash = BC.HashPassword("Test@1234", workFactor: 12),
                HireDate = new DateOnly(2023, 6, 1), IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }

        // EMP003 — วิชัย ผู้จัดการ (Supervisor)
        if (!await db.Employees.AnyAsync(x => x.Id == Employee3Id, ct))
        {
            db.Employees.Add(new Employee
            {
                Id = Employee3Id, CompanyId = CompanyId, DepartmentId = DeptItId,
                EmployeeCode = "EMP003", FirstName = "วิชัย", LastName = "ผู้จัดการ",
                Email = "emp003@test.com", NationalId = "1100100000003",
                PasswordHash = BC.HashPassword("Test@1234", workFactor: 12),
                HireDate = new DateOnly(2022, 3, 1), IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task SeedEmployeeRoleAsync(CancellationToken ct)
    {
        var seedRoles = new[]
        {
            (Id: RoleId,  EmployeeId: EmployeeId,  Role: RoleType.Hr),
            (Id: Role2Id, EmployeeId: Employee2Id, Role: RoleType.Employee),
            (Id: Role3Id, EmployeeId: Employee3Id, Role: RoleType.Supervisor),
        };

        foreach (var seed in seedRoles)
        {
            // เช็ค EmployeeId + Role โดยไม่สนใจ IsActive
            // ถ้าเคยมี record (แม้ inactive = ถูก remove แล้ว) → ไม่ restore
            var alreadySeeded = await db.EmployeeRoles.AnyAsync(
                r => r.EmployeeId == seed.EmployeeId && r.Role == seed.Role, ct);

            if (!alreadySeeded)
            {
                db.EmployeeRoles.Add(new EmployeeRole
                {
                    Id          = seed.Id,
                    EmployeeId  = seed.EmployeeId,
                    Role        = seed.Role,
                    CompanyId   = CompanyId,
                    IsActive    = true,
                    CreatedAt   = DateTime.UtcNow,
                    UpdatedAt   = DateTime.UtcNow,
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task SeedLeaveBalanceAsync(CancellationToken ct)
    {
        // Legacy 2025 seed — keep for idempotency
        if (!await db.LeaveBalances.AnyAsync(x => x.Id == BalanceId, ct))
        {
            db.LeaveBalances.Add(new LeaveBalance
            {
                Id = BalanceId,
                EmployeeId = EmployeeId,
                LeaveTypeId = LeaveTypeAL,
                Year = 2025,
                TotalDays = 10,
                UsedDays = 0,
                PendingDays = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        // Auto-seed current year for all active employees × leave types in each company
        var currentYear = DateTime.UtcNow.Year;

        var employees = await db.Employees
            .Where(e => e.IsActive)
            .Select(e => new { e.Id, e.CompanyId })
            .ToListAsync(ct);

        var leaveTypes = await db.LeaveTypes
            .Where(lt => lt.IsActive)
            .Select(lt => new { lt.Id, lt.DefaultDaysPerYear })
            .ToListAsync(ct);

        var existingKeys = await db.LeaveBalances
            .Where(b => b.Year == currentYear)
            .Select(b => new { b.EmployeeId, b.LeaveTypeId })
            .ToListAsync(ct);

        var existingSet = existingKeys
            .Select(k => (k.EmployeeId, k.LeaveTypeId))
            .ToHashSet();

        var toAdd = new List<LeaveBalance>();
        foreach (var emp in employees)
        {
            foreach (var lt in leaveTypes)
            {
                if (!existingSet.Contains((emp.Id, lt.Id)))
                {
                    toAdd.Add(new LeaveBalance
                    {
                        EmployeeId = emp.Id,
                        LeaveTypeId = lt.Id,
                        Year = currentYear,
                        TotalDays = lt.DefaultDaysPerYear,
                        UsedDays = 0,
                        PendingDays = 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        if (toAdd.Count > 0)
        {
            db.LeaveBalances.AddRange(toAdd);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded {Count} leave balance(s) for year {Year}", toAdd.Count, currentYear);
        }
    }
}
