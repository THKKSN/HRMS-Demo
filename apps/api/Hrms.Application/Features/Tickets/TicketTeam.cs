using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets;

/// <summary>ผู้รับข้อความ 1 คนในทีมของใบแจ้งเรื่อง (ใช้ fan-out notification)</summary>
internal sealed record TicketTeamRecipient(Guid EmployeeId, string? LineUserId, string Name, bool IsOwner);

/// <summary>
/// ทางเข้าเดียวของคำถาม "ใครอยู่ในทีมของใบแจ้งเรื่องนี้"
/// ทีมทั้งหมดเก็บอยู่ในตาราง ticket_assignments แถวเดียวกัน แยกด้วย <c>MemberRole</c>
/// Owner (ผู้รับผิดชอบหลัก) = IsPrimary จำกัด 1 คนต่อใบด้วย unique index (TicketId, ActiveSlot)
/// Member (ผู้ร่วมงาน) = แถวที่ไม่ใช่ primary และ ActiveSlot ต้องเป็น null
/// ห้าม query ticket_assignments ตรง ๆ จากที่อื่น ให้เพิ่มเมธอดในไฟล์นี้แทน
/// </summary>
internal static class TicketTeam
{
    // permission code — ต้องตรงกับ PermissionSeeder และ docs/sql/permission-v1-1-1.sql
    public const string ManageTeamPermission = "ticket:manage-team";
    public const string WorkAsMemberPermission = "ticket:work-as-team-member";

    /// <summary>ผู้รับผิดชอบหลักคนปัจจุบัน</summary>
    public static Task<bool> IsActiveOwnerAsync(
        IApplicationDbContext db, Guid employeeId, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticketId && a.AssignedToEmployeeId == employeeId && a.IsActive && a.IsPrimary, ct);

    /// <summary>ผู้ร่วมงานที่ยังอยู่ในทีม (ไม่รวม Owner)</summary>
    public static Task<bool> IsActiveMemberAsync(
        IApplicationDbContext db, Guid employeeId, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticketId && a.AssignedToEmployeeId == employeeId && a.IsActive && !a.IsPrimary, ct);

    /// <summary>อยู่ในทีมตอนนี้ ไม่ว่าจะเป็น Owner หรือ Member</summary>
    public static Task<bool> IsActiveWorkerAsync(
        IApplicationDbContext db, Guid employeeId, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticketId && a.AssignedToEmployeeId == employeeId && a.IsActive, ct);

    /// <summary>
    /// เคยอยู่ในทีมของใบนี้ (ไม่กรอง IsActive) — ใช้กับ "สิทธิ์ดู" เท่านั้น
    /// เจตนาให้อดีตผู้รับผิดชอบ/ผู้ร่วมงานที่ถูกถอดออกยังเปิดดูใบเดิมที่ตัวเองทำไว้ได้
    /// </summary>
    public static Task<bool> WasEverWorkerAsync(
        IApplicationDbContext db, Guid employeeId, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticketId && a.AssignedToEmployeeId == employeeId, ct);

    /// <summary>ใบนี้มีผู้รับผิดชอบหลักอยู่แล้วหรือไม่ (ใช้ตัดสิทธิ์ claim — ผู้ร่วมงานไม่นับ)</summary>
    public static Task<bool> HasActiveOwnerAsync(
        IApplicationDbContext db, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().AnyAsync(a =>
            a.TicketId == ticketId && a.IsActive && a.IsPrimary, ct);

    /// <summary>จำนวนผู้ร่วมงานที่ยังอยู่ในทีม (ไม่รวม Owner) ใช้เช็คเพดาน</summary>
    public static Task<int> ActiveMemberCountAsync(
        IApplicationDbContext db, Guid ticketId, CancellationToken ct)
        => db.TicketAssignments.AsNoTracking().CountAsync(a =>
            a.TicketId == ticketId && a.IsActive && !a.IsPrimary, ct);

    /// <summary>
    /// ลงมือทำงานกับใบนี้ได้หรือไม่ — Admin / Owner / Member ที่มี permission ผู้ร่วมงาน
    /// ไม่เช็ค permission ของ action เอง ผู้เรียกต้องเช็คก่อน (เช่น ticket:update-status)
    /// </summary>
    public static async Task<bool> CanWorkAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        Guid ticketId,
        CancellationToken ct)
    {
        if (currentUser.HasRole(RoleType.Admin)) return true;
        var employeeId = currentUser.EmployeeId;
        if (!employeeId.HasValue) return false;
        if (await IsActiveOwnerAsync(db, employeeId.Value, ticketId, ct)) return true;
        return await IsActiveMemberAsync(db, employeeId.Value, ticketId, ct) &&
            await permissions.HasPermissionAsync(currentUser, WorkAsMemberPermission, ct);
    }

    /// <summary>เช็ค permission ของ action + ต้องอยู่ในทีมที่ทำงานได้ ไม่ผ่านโยน 403</summary>
    public static async Task EnsureCanWorkAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        string permission,
        Guid ticketId,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, permission, ct);
        if (!await CanWorkAsync(db, currentUser, permissions, ticketId, ct))
            throw new AppForbiddenException("TICKET_TEAM_MEMBER_ONLY", "Only the primary assignee or a team member can do this.");
    }

    /// <summary>
    /// เช็ค permission ของ action + ต้องเป็นผู้รับผิดชอบหลัก (หรือ Admin) ไม่ผ่านโยน 403
    /// ใช้กับ action ที่ต้องมีเจ้าภาพเดียว เช่น ส่งตรวจจบงาน
    /// </summary>
    public static async Task EnsureOwnerAsync(
        IApplicationDbContext db,
        ICurrentUser currentUser,
        IPermissionService permissions,
        string permission,
        Guid ticketId,
        CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, permission, ct);
        if (currentUser.HasRole(RoleType.Admin)) return;
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (await IsActiveOwnerAsync(db, employeeId, ticketId, ct)) return;
        throw new AppForbiddenException("TICKET_OWNER_ONLY", "Only the primary assignee of this ticket can do this.");
    }

    /// <summary>
    /// ตรวจผู้ดูแลการ์ดกิจกรรม (งานย่อย) — ต้องเป็นคนที่ยังอยู่ในทีมของใบนี้
    /// ไม่ส่งค่ามา = ยกให้ผู้ลงมือเอง เพื่อให้พฤติกรรมเดิม (การ์ดเป็นของคนที่สร้าง) ไม่เปลี่ยน
    /// </summary>
    public static async Task<Guid> ResolveCardOwnerAsync(
        IApplicationDbContext db,
        Guid ticketId,
        Guid? requestedOwnerId,
        Guid actorId,
        CancellationToken ct)
    {
        if (!requestedOwnerId.HasValue || requestedOwnerId.Value == actorId) return actorId;
        if (!await IsActiveWorkerAsync(db, requestedOwnerId.Value, ticketId, ct))
            throw new BadRequestException("TICKET_PROGRESS_OWNER_NOT_IN_TEAM", "The card owner must be a member of this ticket team.");
        return requestedOwnerId.Value;
    }

    /// <summary>
    /// ผู้รับ notification ฝั่งคนทำงานของใบนี้ — Owner + Member ที่ยังอยู่ในทีม
    /// เรียงให้ Owner มาก่อนเพื่อให้ข้อความ/ลำดับ outbox คงที่ (ทดสอบง่ายและอ่าน log ง่าย)
    /// </summary>
    public static async Task<IReadOnlyList<TicketTeamRecipient>> ActiveRecipientsAsync(
        IApplicationDbContext db, Guid ticketId, CancellationToken ct)
        => await db.TicketAssignments.AsNoTracking()
            .Where(a => a.TicketId == ticketId && a.IsActive)
            .OrderByDescending(a => a.IsPrimary)
            .ThenBy(a => a.AssignedAt)
            .Select(a => new TicketTeamRecipient(
                a.AssignedToEmployeeId,
                a.AssignedToEmployee.LineUserId,
                (a.AssignedToEmployee.FirstName + " " + a.AssignedToEmployee.LastName).Trim(),
                a.IsPrimary))
            .ToListAsync(ct);
}
