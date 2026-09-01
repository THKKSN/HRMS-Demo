using Hrms.Domain.Entities;
using Hrms.Domain.Constants;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence;

public class PermissionSeeder(HrmsDbContext db)
{
    private static readonly (Guid Id, RoleType Code, string NameTh)[] SystemRoles =
    [
        (SystemRoleIds.Employee, RoleType.Employee, "พนักงาน"),
        (SystemRoleIds.Supervisor, RoleType.Supervisor, "หัวหน้างาน"),
        (SystemRoleIds.Hr, RoleType.Hr, "ฝ่ายทรัพยากรบุคคล"),
        (SystemRoleIds.Executive, RoleType.Executive, "ผู้บริหาร"),
        (SystemRoleIds.Admin, RoleType.Admin, "ผู้ดูแลระบบ"),
    ];

    // Permission catalog — (code, module, action, description)
    private static readonly (string Code, string Module, string Action, string Description)[] AllPermissions =
    [
        // employee
        ("employee:view",           "employee",   "view",          "ดูข้อมูลพนักงาน"),
        ("employee:create",         "employee",   "create",        "สร้างพนักงานใหม่"),
        ("employee:edit",           "employee",   "edit",          "แก้ไขข้อมูลพนักงาน"),
        ("employee:toggle-status",  "employee",   "toggle-status", "เปิด/ปิดสถานะพนักงาน"),
        ("employee:reset-password", "employee",   "reset-password","รีเซ็ต password พนักงาน"),
        ("employee:assign-role",    "employee",   "assign-role",   "กำหนด Role พนักงาน"),
        // leave
        ("leave:request",           "leave",      "create",        "ยื่นใบลา"),
        ("leave:view-own",          "leave",      "view",          "ดูการลาตัวเอง"),
        ("leave:view-team",         "leave",      "view",          "ดูการลาทีม"),
        ("leave:view-all",          "leave",      "view",          "ดูการลาทุกคน"),
        ("leave:approve-supervisor","leave",      "approve",       "อนุมัติรอบแรก (Supervisor)"),
        ("leave:approve-hr",        "leave",      "approve",       "อนุมัติรอบสอง (HR)"),
        ("leave:manage-balance",    "leave",      "manage",        "จัดการโควต้าวันลา"),
        ("leave:manage-types",      "leave",      "manage",        "จัดการประเภทการลา"),
        // attendance
        ("attendance:check-in",     "attendance", "create",        "เช็คอิน/เช็คเอาท์"),
        ("attendance:view-own",     "attendance", "view",          "ดูประวัติการเข้างานตัวเอง"),
        ("attendance:view-team",    "attendance", "view",          "ดูประวัติการเข้างานทีม"),
        ("attendance:view-all",     "attendance", "view",          "ดูประวัติการเข้างานทุกคน"),
        ("attendance:edit",         "attendance", "edit",          "แก้ไขบันทึกการเข้างาน"),
        ("attendance:manage-policy","attendance", "manage",        "ตั้งกฎการเข้างาน"),
        ("attendance:report",       "attendance", "report",        "รายงาน/สรุปสถิติการเข้างาน"),
        // company
        ("company:view",            "company",    "view",          "ดูข้อมูลบริษัท"),
        ("company:edit",            "company",    "edit",          "แก้ไขข้อมูลบริษัท"),
        ("company:manage-departments","company",  "manage",        "จัดการแผนก"),
        ("company:manage-shifts",   "company",    "manage",        "จัดการเวลาทำงาน"),
        ("company:manage-holidays", "company",    "manage",        "จัดการวันหยุด"),
        ("company:manage-locations","company",    "manage",        "จัดการสถานที่"),
        // ot
        ("ot:request",              "ot",         "create",        "ยื่นขอ OT"),
        ("ot:view-own",             "ot",         "view",          "ดู OT ของตัวเอง"),
        ("ot:view-team",            "ot",         "view",          "ดู OT ของทีม"),
        ("ot:view-all",             "ot",         "view",          "ดู OT ทุกคน"),
        ("ot:approve-supervisor",   "ot",         "approve",       "อนุมัติ OT รอบแรก (Supervisor)"),
        ("ot:approve-hr",           "ot",         "approve",       "อนุมัติ OT รอบสอง (HR)"),
        // ticket
        ("ticket:create",             "ticket",    "create",        "เปิดใบแจ้งเรื่อง"),
        ("ticket:view-own",           "ticket",    "view",          "ดูใบแจ้งเรื่องของตัวเอง"),
        ("ticket:view-team",          "ticket",    "view",          "ดูใบแจ้งเรื่องของทีม/แผนก"),
        ("ticket:view-assigned",      "ticket",    "view",          "ดูใบแจ้งเรื่องที่ได้รับมอบหมาย"),
        ("ticket:view-all",           "ticket",    "view",          "ดูใบแจ้งเรื่องทั้งหมด"),
        ("ticket:assign",             "ticket",    "assign",        "มอบหมายใบแจ้งเรื่อง"),
        ("ticket:triage",             "ticket",    "update",        "จัดหมวดและปรับความสำคัญใบแจ้งเรื่อง"),
        ("ticket:update-status",      "ticket",    "update",        "เปลี่ยนสถานะใบแจ้งเรื่อง"),
        ("ticket:resolve",            "ticket",    "resolve",       "บันทึกผลการดำเนินการ"),
        ("ticket:close",              "ticket",    "close",         "ปิดใบแจ้งเรื่อง"),
        ("ticket:verify",             "ticket",    "verify",        "ตรวจรับใบแจ้งเรื่อง"),
        // ticket-taxonomy (แยก module จาก ticket เพราะเป็นการตั้งค่า ไม่ใช่การดำเนินการกับใบแจ้งเรื่อง)
        ("ticket:manage-categories",  "ticket-taxonomy", "manage",  "จัดการหมวดแจ้งเรื่อง"),
        ("ticket:manage-topics",      "ticket-taxonomy", "manage",  "จัดการหัวข้อย่อยแจ้งเรื่อง"),
        ("ticket:manage-responsibilities", "ticket-taxonomy", "manage", "จัดการผู้รับผิดชอบแจ้งเรื่อง"),
        ("ticket:manage-external-config", "ticket-taxonomy", "manage", "จัดการช่องทางและหมวดแจ้งเรื่องสำหรับบุคคลภายนอก"),
        ("ticket:comment",            "ticket",    "create",        "เพิ่มความคิดเห็นในใบแจ้งเรื่อง"),
        ("ticket:add-internal-note",  "ticket",    "create",        "เพิ่มบันทึกภายในใบแจ้งเรื่อง"),
        ("ticket:add-attachment",     "ticket",    "create",        "เพิ่มหลักฐานในใบแจ้งเรื่อง"),
        ("ticket:return",             "ticket",    "update",        "ส่งใบแจ้งเรื่องกลับแก้ไข"),
        ("ticket:view-report",        "ticket",    "report",        "ดูรายงานใบแจ้งเรื่อง"),
        ("ticket:export-report",      "ticket",    "export",        "ส่งออกรายงานใบแจ้งเรื่อง"),
        // expense
        ("expense:create",            "expense",    "create",        "สร้างและส่งรายการวางบิล"),
        ("expense:view-own",          "expense",    "view",          "ดูรายการวางบิลของตัวเอง"),
        ("expense:update-draft",      "expense",    "update",        "แก้ไขรายการวางบิลแบบร่าง"),
        ("expense:upload-attachment", "expense",    "create",        "อัปโหลดหลักฐานประกอบรายการวางบิล"),
        ("expense:ocr",               "expense",    "create",        "อ่านข้อมูลจากหลักฐานวางบิลด้วย OCR"),
        ("expense:view-all",          "expense",    "view",          "ดูรายการวางบิลทั้งหมด"),
        ("expense:review",            "expense",    "review",        "ตรวจและอนุมัติบิลค่าใช้จ่าย"),
        ("expense:export",            "expense",    "export",        "ส่งออกรายการวางบิล"),
        ("expense:create-batch",      "expense",    "create",        "สร้างรอบวางบิลค่าใช้จ่าย"),
        ("expense:mark-paid",         "expense",    "update",        "บันทึกจ่ายเงินรอบวางบิล"),
        // system
        ("system:manage-roles",     "system",     "manage",        "จัดการ Permission ของ Role"),
        ("system:view-audit-logs",  "system",     "view",          "ดู Audit Log"),
        ("system:manage-notifications", "system", "manage",        "ตรวจสอบและส่งการแจ้งเตือนใหม่"),
        ("system:manage-companies", "system",     "manage",        "สร้าง/แก้ไข Company"),
        ("system:manage-ticket",    "system",     "manage",        "ตั้งค่าหมวด หมวดย่อย หัวข้อ และ Template/Suggest ของระบบแจ้งเรื่อง"),
        ("system:manage-memo",      "system",     "manage",        "ตั้งค่าประเภทเรื่อง หมวดหมู่ และหัวข้อย่อยของระบบMemo"),
        // memo
        ("memo:create",             "memo",       "create",        "สร้างMemo"),
        ("memo:view-own",           "memo",       "view",          "ดูMemoของตัวเอง"),
        ("memo:approve",            "memo",       "approve",       "อนุมัติ/ไม่Memo (ผู้บริหาร)"),
        ("memo:view-inbox",         "memo",       "view",          "ดู Memo เข้าแผนก และรับทราบ/ส่งมอบ (หัวหน้าแผนกปลายทาง)"),
    ];

    // Default permissions per role
    private static readonly Dictionary<string, string[]> DefaultRolePermissions = new()
    {
        ["Employee"] =
        [
            "leave:request", "leave:view-own",
            "attendance:check-in", "attendance:view-own",
            "ot:request", "ot:view-own",
            "ticket:create", "ticket:view-own", "ticket:view-assigned",
            "ticket:update-status", "ticket:resolve", "ticket:comment", "ticket:add-attachment",
            "expense:create", "expense:view-own", "expense:update-draft", "expense:upload-attachment", "expense:ocr",
            "memo:create", "memo:view-own",
        ],
        ["Supervisor"] =
        [
            "leave:request", "leave:view-own", "leave:view-team", "leave:approve-supervisor",
            "attendance:check-in", "attendance:view-own", "attendance:view-team",
            "employee:view",
            "ot:request", "ot:view-own", "ot:view-team", "ot:approve-supervisor",
            "ticket:create", "ticket:view-own", "ticket:view-team", "ticket:view-assigned",
            "ticket:assign", "ticket:triage", "ticket:update-status", "ticket:resolve", "ticket:close", "ticket:verify",
            "ticket:manage-categories", "ticket:manage-topics", "ticket:manage-responsibilities",
            "ticket:manage-external-config",
            "ticket:comment", "ticket:add-internal-note", "ticket:add-attachment",
            "ticket:return", "ticket:view-report",
            "expense:create", "expense:view-own", "expense:update-draft", "expense:upload-attachment", "expense:ocr",
            "system:manage-ticket", "system:manage-memo",
            "memo:create", "memo:view-own", "memo:view-inbox",
        ],
        ["Hr"] =
        [
            "employee:view", "employee:create", "employee:edit", "employee:toggle-status",
            "leave:request", "leave:view-own", "leave:view-team", "leave:view-all",
            "leave:approve-supervisor", "leave:approve-hr", "leave:manage-balance", "leave:manage-types",
            "attendance:check-in", "attendance:view-own", "attendance:view-team", "attendance:view-all",
            "attendance:edit", "attendance:manage-policy", "attendance:report",
            "company:view", "company:manage-departments", "company:manage-shifts",
            "company:manage-holidays", "company:manage-locations",
            "ot:request", "ot:view-own", "ot:view-team", "ot:view-all",
            "ot:approve-supervisor", "ot:approve-hr",
            "ticket:create", "ticket:view-own", "ticket:view-team", "ticket:view-all",
            "ticket:comment", "ticket:add-attachment",
            "expense:create", "expense:view-own", "expense:update-draft", "expense:upload-attachment", "expense:ocr",
            "expense:view-all", "expense:review", "expense:export", "expense:create-batch", "expense:mark-paid",
            "memo:create", "memo:view-own",
        ],
        ["Executive"] =
        [
            "employee:view",
            "leave:view-all",
            "attendance:report",
            "company:view",
            "ot:view-all",
            "ticket:view-all", "ticket:view-report",
            "expense:view-all",
            "memo:create", "memo:view-own", "memo:approve",
        ],
        ["Admin"] =
        [
            "employee:view", "employee:create", "employee:edit", "employee:toggle-status",
            "employee:reset-password", "employee:assign-role",
            "leave:request", "leave:view-own", "leave:view-team", "leave:view-all",
            "leave:approve-supervisor", "leave:approve-hr", "leave:manage-balance", "leave:manage-types",
            "attendance:check-in", "attendance:view-own", "attendance:view-team", "attendance:view-all",
            "attendance:edit", "attendance:manage-policy", "attendance:report",
            "company:view", "company:edit", "company:manage-departments", "company:manage-shifts",
            "company:manage-holidays", "company:manage-locations",
            "ot:request", "ot:view-own", "ot:view-team", "ot:view-all",
            "ot:approve-supervisor", "ot:approve-hr",
            "ticket:create", "ticket:view-own", "ticket:view-team", "ticket:view-assigned", "ticket:view-all",
            "ticket:assign", "ticket:triage", "ticket:update-status", "ticket:resolve", "ticket:close", "ticket:verify",
            "ticket:manage-categories", "ticket:manage-topics", "ticket:manage-responsibilities",
            "ticket:manage-external-config",
            "ticket:comment", "ticket:add-internal-note", "ticket:add-attachment",
            "ticket:return", "ticket:view-report", "ticket:export-report",
            "expense:create", "expense:view-own", "expense:update-draft", "expense:upload-attachment", "expense:ocr",
            "expense:view-all", "expense:review", "expense:export", "expense:create-batch", "expense:mark-paid",
            "system:manage-roles", "system:view-audit-logs", "system:manage-notifications",
            "system:manage-companies", "system:manage-ticket", "system:manage-memo",
            "memo:create", "memo:view-own", "memo:approve",
        ],
    };

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var existingRoleIds = await db.SystemRoles
            .Select(role => role.Id)
            .ToListAsync(ct);
        var existingRoleIdSet = existingRoleIds.ToHashSet();
        var roleNow = DateTime.UtcNow.AddHours(7);
        var rolesToAdd = SystemRoles
            .Where(role => !existingRoleIdSet.Contains(role.Id))
            .Select(role => new SystemRole
            {
                Id = role.Id,
                Code = role.Code,
                NameTh = role.NameTh,
                IsSystem = true,
                IsActive = true,
                CreatedAt = roleNow,
                UpdatedAt = roleNow,
            })
            .ToList();

        if (rolesToAdd.Count > 0)
        {
            db.SystemRoles.AddRange(rolesToAdd);
            await db.SaveChangesAsync(ct);
        }

        var existingCodesList = await db.Permissions
            .Select(p => p.Code)
            .ToListAsync(ct);
        var existingCodes = existingCodesList.ToHashSet();

        var now = DateTime.UtcNow.AddHours(7);
        var toAdd = AllPermissions
            .Where(p => !existingCodes.Contains(p.Code))
            .Select(p => new Permission
            {
                Id = Guid.NewGuid(),
                Code = p.Code,
                Module = p.Module,
                Action = p.Action,
                Description = p.Description,
                IsSystem = true,
                CreatedAt = now,
                UpdatedAt = now,
            })
            .ToList();

        if (toAdd.Count > 0)
        {
            db.Permissions.AddRange(toAdd);
            await db.SaveChangesAsync(ct);
        }

        // sync module/action/description ของ permission ที่มีอยู่แล้วให้ตรงกับ catalog เสมอ
        // (เช่น ticket:manage-* ที่ย้าย module จาก "ticket" ไป "ticket-taxonomy")
        var catalogByCode = AllPermissions.ToDictionary(p => p.Code);
        var existingPermissions = await db.Permissions
            .Where(p => existingCodes.Contains(p.Code))
            .ToListAsync(ct);
        var changed = false;
        foreach (var permission in existingPermissions)
        {
            if (!catalogByCode.TryGetValue(permission.Code, out var def)) continue;
            if (permission.Module == def.Module && permission.Action == def.Action && permission.Description == def.Description) continue;
            permission.Module = def.Module;
            permission.Action = def.Action;
            permission.Description = def.Description;
            permission.UpdatedAt = now;
            changed = true;
        }
        if (changed)
            await db.SaveChangesAsync(ct);

        // Load full permission map after seed
        var permissionMap = await db.Permissions
            .ToDictionaryAsync(p => p.Code, p => p.Id, ct);

        // Seed default role_permissions (idempotent)
        var existingRolePerms = await db.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync(ct);

        var existingSet = existingRolePerms
            .Select(rp => (rp.RoleId, rp.PermissionId))
            .ToHashSet();

        var rolePermsToAdd = new List<RolePermission>();
        foreach (var (role, codes) in DefaultRolePermissions)
        {
            if (!Enum.TryParse<RoleType>(role, out var roleCode)) continue;
            var roleId = SystemRoleIds.FromCode(roleCode);

            foreach (var code in codes)
            {
                if (!permissionMap.TryGetValue(code, out var permId)) continue;
                if (existingSet.Contains((roleId, permId))) continue;

                rolePermsToAdd.Add(new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = roleId,
                    PermissionId = permId,
                    GrantedAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
        }

        if (rolePermsToAdd.Count > 0)
        {
            db.RolePermissions.AddRange(rolePermsToAdd);
            await db.SaveChangesAsync(ct);
        }
    }
}
