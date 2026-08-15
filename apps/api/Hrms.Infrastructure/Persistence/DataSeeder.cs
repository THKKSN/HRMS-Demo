using BC = BCrypt.Net.BCrypt;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Domain.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Persistence;

public class DataSeeder(HrmsDbContext db, ILogger<DataSeeder> logger, PermissionSeeder permissionSeeder)
{
    // Fixed GUIDs so re-runs stay idempotent
    private static readonly Guid CompanyId    = new("3fa85f64-5717-4562-b3fc-2c963f66a001");
    private static readonly Guid DeptHrId     = new("3fa85f64-5717-4562-b3fc-2c963f66a002");
    private static readonly Guid DeptItId     = new("3fa85f64-5717-4562-b3fc-2c963f66a013");
    private static readonly Guid LeaveTypeAL  = new("3fa85f64-5717-4562-b3fc-2c963f66a003");
    private static readonly Guid LeaveTypeSL  = new("3fa85f64-5717-4562-b3fc-2c963f66a011");
    private static readonly Guid LeaveTypePL  = new("3fa85f64-5717-4562-b3fc-2c963f66a012");
    // SYSADMIN — System Admin
    private static readonly Guid SystemAdminEmployeeId = new("3fa85f64-5717-4562-b3fc-2c963f66a004");
    private static readonly Guid SystemAdminRoleId     = new("3fa85f64-5717-4562-b3fc-2c963f66a005");
    private static readonly Guid BalanceId    = new("3fa85f64-5717-4562-b3fc-2c963f66a006");
    private static readonly Guid TicketCatSystemId   = new("3fa85f64-5717-4562-b3fc-2c963f66a101");
    private static readonly Guid TicketCatNetworkId  = new("3fa85f64-5717-4562-b3fc-2c963f66a102");
    private static readonly Guid TicketCatHardwareId = new("3fa85f64-5717-4562-b3fc-2c963f66a103");
    private static readonly Guid TicketCatVehicleId  = new("3fa85f64-5717-4562-b3fc-2c963f66a104");
    private static readonly Guid TicketCatOtherId    = new("3fa85f64-5717-4562-b3fc-2c963f66a105");

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedCompanyAsync(ct);
        await SeedDepartmentAsync(ct);
        await SeedLeaveTypeAsync(ct);
        await permissionSeeder.SeedAsync(ct);
        await SeedEmployeeAsync(ct);
        await SeedDepartmentManagerAsync(ct);
        await SeedEmployeeRoleAsync(ct);
        await SeedLeaveBalanceAsync(ct);
        await SeedTicketTaxonomyAsync(ct);
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
        var admin = await db.Employees.FirstOrDefaultAsync(x =>
            x.Id == SystemAdminEmployeeId ||
            x.EmployeeCode == "SYSADMIN" ||
            x.Email == "tbg.line.dev@gmail.com", ct);

        if (admin is null)
        {
            db.Employees.Add(new Employee
            {
                Id = SystemAdminEmployeeId, CompanyId = CompanyId, DepartmentId = DeptHrId,
                EmployeeCode = "SYSADMIN", FirstName = "System", LastName = "Admin",
                Email = "tbg.line.dev@gmail.com",
                PasswordHash = BC.HashPassword("P@55W0rd", workFactor: 12),
                HireDate = new DateOnly(2023, 1, 1), IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            admin.CompanyId = CompanyId;
            admin.DepartmentId = DeptHrId;
            admin.EmployeeCode = "SYSADMIN";
            admin.FirstName = "System";
            admin.LastName = "Admin";
            admin.Email = "tbg.line.dev@gmail.com";
            admin.Phone = null;
            admin.NationalId = null;
            admin.LineUserId = null;
            admin.AvatarUrl = null;
            admin.PasswordHash = BC.HashPassword("P@55W0rd", workFactor: 12);
            admin.HireDate = new DateOnly(2023, 1, 1);
            admin.IsActive = true;
            admin.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task SeedEmployeeRoleAsync(CancellationToken ct)
    {
        var seedRoles = new[]
        {
            (Id: SystemAdminRoleId, EmployeeId: SystemAdminEmployeeId, RoleId: SystemRoleIds.Admin),
        };

        foreach (var seed in seedRoles)
        {
            // เช็ค EmployeeId + Role โดยไม่สนใจ IsActive
            // ถ้าเคยมี record (แม้ inactive = ถูก remove แล้ว) → ไม่ restore
            var alreadySeeded = await db.EmployeeRoles.AnyAsync(
                r => r.EmployeeId == seed.EmployeeId && r.RoleId == seed.RoleId, ct);

            if (!alreadySeeded)
            {
                db.EmployeeRoles.Add(new EmployeeRole
                {
                    Id          = seed.Id,
                    EmployeeId  = seed.EmployeeId,
                    RoleId      = seed.RoleId,
                    CompanyId   = CompanyId,
                    IsActive    = true,
                    CreatedAt   = DateTime.UtcNow,
                    UpdatedAt   = DateTime.UtcNow,
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task SeedDepartmentManagerAsync(CancellationToken ct)
    {
        var itDepartment = await db.Departments.FirstOrDefaultAsync(d => d.Id == DeptItId, ct);
        if (itDepartment is null || itDepartment.ManagerEmployeeId is null) return;

        itDepartment.ManagerEmployeeId = null;
        itDepartment.UpdatedAt = DateTime.UtcNow;
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
                EmployeeId = SystemAdminEmployeeId,
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

    private async Task SeedTicketTaxonomyAsync(CancellationToken ct)
    {
        var categories = new[]
        {
            new TicketCategory { Id = TicketCatSystemId, CompanyId = CompanyId, DepartmentId = DeptItId, Name = "ระบบงาน", Description = "ระบบงานภายในองค์กร", SortOrder = 10, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new TicketCategory { Id = TicketCatNetworkId, CompanyId = CompanyId, DepartmentId = DeptItId, Name = "เครือข่าย / อินเทอร์เน็ต", Description = "Internet, Wi-Fi, LAN, VPN", SortOrder = 20, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new TicketCategory { Id = TicketCatHardwareId, CompanyId = CompanyId, DepartmentId = DeptItId, Name = "ฮาร์ดแวร์", Description = "อุปกรณ์คอมพิวเตอร์และเครื่องพิมพ์", SortOrder = 30, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new TicketCategory { Id = TicketCatVehicleId, CompanyId = CompanyId, DepartmentId = DeptItId, Name = "รถ / อุปกรณ์ประจำรถ", Description = "อุปกรณ์ IT ที่ติดตั้งกับรถ", SortOrder = 40, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new TicketCategory { Id = TicketCatOtherId, CompanyId = CompanyId, DepartmentId = DeptItId, Name = "อื่น ๆ", Description = "เรื่องอื่น ๆ", SortOrder = 99, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
        };

        var categoryIds = categories.Select(c => c.Id).ToList();
        var existingCategoryIds = await db.TicketCategories
            .Where(c => categoryIds.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync(ct);

        db.TicketCategories.AddRange(categories.Where(c => !existingCategoryIds.Contains(c.Id)));
        await db.SaveChangesAsync(ct);

        var topics = new[]
        {
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a111", TicketCatSystemId, "HTML", 10),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a112", TicketCatSystemId, "DTMS", 20),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a113", TicketCatSystemId, "SMMS", 30),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a114", TicketCatSystemId, "SUN ACC", 40),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a115", TicketCatSystemId, "VMS", 50),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a116", TicketCatSystemId, "PISWIN", 60),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a121", TicketCatNetworkId, "INTERNET", 10),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a122", TicketCatNetworkId, "Wi-Fi", 20),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a123", TicketCatNetworkId, "LAN", 30),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a131", TicketCatHardwareId, "PRINTER", 10),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a132", TicketCatHardwareId, "Computer", 20),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a133", TicketCatHardwareId, "Notebook", 30),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a141", TicketCatVehicleId, "กล้องรถ", 10),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a142", TicketCatVehicleId, "GPS", 20),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a143", TicketCatVehicleId, "Sensor", 30),
            Topic("3fa85f64-5717-4562-b3fc-2c963f66a151", TicketCatOtherId, "อื่น ๆ", 10),
        };

        var topicIds = topics.Select(t => t.Id).ToList();
        var existingTopicIds = await db.TicketTopics
            .Where(t => topicIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(ct);

        db.TicketTopics.AddRange(topics.Where(t => !existingTopicIds.Contains(t.Id)));
        await db.SaveChangesAsync(ct);

        var subjects = new[]
        {
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b111", topics[0], "เข้าใช้งานไม่ได้", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b112", topics[0], "ข้อมูลแสดงผลผิดพลาด", 20),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b121", topics[6], "อินเทอร์เน็ตใช้งานไม่ได้", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b122", topics[7], "Wi-Fi เชื่อมต่อไม่ได้", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b131", topics[9], "เครื่องพิมพ์ไม่ทำงาน", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b132", topics[10], "คอมพิวเตอร์เปิดไม่ติด", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b141", topics[12], "กล้องรถกาวหลุด", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b142", topics[12], "กล้องรถไม่บันทึกภาพ", 20),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b143", topics[13], "GPS ไม่ส่งตำแหน่ง", 10),
            Subject("3fa85f64-5717-4562-b3fc-2c963f66b151", topics[15], "อื่น ๆ", 10),
        };

        var subjectIds = subjects.Select(s => s.Id).ToList();
        var existingSubjectIds = await db.TicketSubjects
            .Where(s => subjectIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(ct);

        db.TicketSubjects.AddRange(subjects.Where(s => !existingSubjectIds.Contains(s.Id)));
        await db.SaveChangesAsync(ct);

        TicketTopic Topic(string id, Guid categoryId, string name, int sortOrder) => new()
        {
            Id = new Guid(id),
            CompanyId = CompanyId,
            DepartmentId = DeptItId,
            CategoryId = categoryId,
            Name = name,
            SortOrder = sortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        TicketSubject Subject(string id, TicketTopic topic, string name, int sortOrder) => new()
        {
            Id = new Guid(id),
            CompanyId = topic.CompanyId,
            DepartmentId = topic.DepartmentId,
            CategoryId = topic.CategoryId,
            TopicId = topic.Id,
            Name = name,
            SortOrder = sortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}
