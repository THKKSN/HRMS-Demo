using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Jobs;

public class LeaveNotificationJob(IApplicationDbContext db, ILineMessagingService line)
{
    public async Task SendApprovalPendingAsync(Guid leaveRequestId)
    {
        var request = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == leaveRequestId);

        if (request is null) return;

        var companyId    = request.Employee.CompanyId;
        var employeeName = $"{request.Employee.FirstName} {request.Employee.LastName}".Trim();
        var dateRange    = $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy}";

        // ตัดสินว่าจะส่งหา Supervisor หรือ HR ตามสถานะปัจจุบัน
        var targetRole = request.Status == LeaveStatus.PendingHr
            ? RoleType.Hr
            : RoleType.Supervisor;

        var altText = $"📋 {employeeName} ขอลา{request.LeaveType.NameTh} {dateRange} ({request.TotalDays} วัน)";
        var text    = $"{employeeName} ขอลา{request.LeaveType.NameTh}\n{dateRange} ({request.TotalDays} วัน)\nกรุณาพิจารณาอนุมัติ";

        var approveData = $"action=approve&leaveId={request.Id}";
        var rejectData  = $"action=reject&leaveId={request.Id}";

        var recipientLineIds = await db.EmployeeRoles
            .Include(r => r.Employee)
            .Where(r =>
                r.Role     == targetRole &&
                r.IsActive &&
                r.Employee.IsActive &&
                r.Employee.CompanyId  == companyId &&
                r.Employee.LineUserId != null)
            .Select(r => r.Employee.LineUserId!)
            .Distinct()
            .ToListAsync();

        foreach (var lineUserId in recipientLineIds)
        {
            try
            {
                await line.PushConfirmTemplateAsync(
                    lineUserId,
                    altText,
                    text,
                    confirmLabel: "อนุมัติ",
                    confirmData:  approveData,
                    rejectLabel:  "ปฏิเสธ",
                    rejectData:   rejectData);
            }
            catch { /* ไม่ให้ job ล้มเหลวถ้า push คนใดคนหนึ่งไม่ได้ */ }
        }
    }

    public async Task SendResultAsync(Guid leaveRequestId)
    {
        var request = await db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == leaveRequestId);

        if (request is null || request.Employee.LineUserId is null) return;

        var message = request.Status switch
        {
            LeaveStatus.Approved => $"✅ คำขอลา{request.LeaveType.NameTh} " +
                                    $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy} " +
                                    $"ของคุณได้รับอนุมัติแล้ว",
            LeaveStatus.Rejected => $"❌ คำขอลา{request.LeaveType.NameTh} " +
                                    $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy} " +
                                    $"ของคุณถูกปฏิเสธ",
            _ => null
        };

        if (message is null) return;

        try { await line.PushMessageAsync(request.Employee.LineUserId, message); }
        catch { /* เงียบๆ ข้าม ถ้า push ไม่ได้ */ }
    }
}
