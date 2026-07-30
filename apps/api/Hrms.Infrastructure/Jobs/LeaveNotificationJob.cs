using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using Hrms.Domain.Constants;
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
        var targetRoleId = SystemRoleIds.FromCode(targetRole);

        var altText = $"📋 {employeeName} ขอลา{request.LeaveType.NameTh} {dateRange} ({request.TotalDays} วัน)";
        var text    = $"{employeeName} ขอลา{request.LeaveType.NameTh}\n{dateRange} ({request.TotalDays} วัน)\nกรุณาพิจารณาอนุมัติ";

        var approveData = $"action=approve&leaveId={request.Id}";
        var rejectData  = $"action=reject&leaveId={request.Id}";

        var recipientLineIds = await db.EmployeeRoles
            .Include(r => r.Employee)
            .Where(r =>
                r.RoleId   == targetRoleId &&
                r.IsActive &&
                r.Employee.IsActive &&
                r.Employee.CompanyId  == companyId &&
                r.Employee.LineUserId != null)
            .Select(r => r.Employee.LineUserId!)
            .Distinct()
            .ToListAsync();

        // ถ้าอยู่ใน PendingHr แสดงว่า Supervisor อนุมัติแล้ว — แสดงชื่อ Supervisor ใน card
        string? priorApproverName = null;
        if (request.Status == LeaveStatus.PendingHr && request.SupervisorId.HasValue)
        {
            var sup = await db.Employees
                .Where(e => e.Id == request.SupervisorId.Value)
                .Select(e => new { Name = (e.FirstName + " " + e.LastName).Trim() })
                .FirstOrDefaultAsync();
            priorApproverName = sup?.Name;
        }

        var attachmentCount = CountAttachments(request.AttachmentUrl);
        var card = BuildApprovalCard(employeeName, request.LeaveType.NameTh, dateRange,
            request.TotalDays, request.Reason, attachmentCount, priorApproverName, approveData, rejectData);

        foreach (var lineUserId in recipientLineIds)
        {
            try
            {
                await line.PushFlexMessageAsync(lineUserId, altText, card);
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
            LeaveStatus.Approved => $"✅ คำขอ{request.LeaveType.NameTh} " +
                                    $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy} " +
                                    $"ของคุณได้รับอนุมัติแล้ว",
            LeaveStatus.Rejected => $"❌ คำขอ{request.LeaveType.NameTh} " +
                                    $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy} " +
                                    $"ของคุณถูกปฏิเสธ",
            _ => null
        };

        if (message is null) return;

        var approved   = request.Status == LeaveStatus.Approved;
        var dateRange  = $"{request.DateFrom:dd/MM/yyyy} – {request.DateTo:dd/MM/yyyy}";

        // ผู้ตัดสินใจสุดท้าย: Approved → HrId, Rejected → HrId ถ้ามี ไม่งั้น SupervisorId
        var finalApproverId = request.HrId ?? request.SupervisorId;
        string? finalApproverName = null;
        if (finalApproverId.HasValue)
        {
            var approver = await db.Employees
                .Where(e => e.Id == finalApproverId.Value)
                .Select(e => new { Name = (e.FirstName + " " + e.LastName).Trim() })
                .FirstOrDefaultAsync();
            finalApproverName = approver?.Name;
        }

        var resultCard = BuildResultCard(
            request.LeaveType.NameTh, dateRange, request.TotalDays, approved,
            finalApproverName, request.HrComment ?? request.SupervisorComment);

        try { await line.PushFlexMessageAsync(request.Employee.LineUserId, message, resultCard); }
        catch { /* เงียบๆ ข้าม ถ้า push ไม่ได้ */ }
    }

    private static int CountAttachments(string? attachmentUrl)
    {
        if (string.IsNullOrWhiteSpace(attachmentUrl)) return 0;
        try { return JsonSerializer.Deserialize<List<string>>(attachmentUrl)?.Count ?? 0; }
        catch { return 1; }
    }

    private static object BuildApprovalCard(
        string employeeName, string leaveTypeName, string dateRange,
        decimal totalDays, string? reason, int attachmentCount,
        string? priorApproverName, string approveData, string rejectData) => new
    {
        type = "bubble",
        header = new
        {
            type = "box", layout = "vertical", paddingAll = "16px",
            backgroundColor = "#1E6FBA",
            contents = new object[]
            {
                new { type = "text", text = "📋 คำขอลางาน", color = "#ffffff", size = "md", weight = "bold" },
                new { type = "text", text = "กรุณาพิจารณาอนุมัติ", color = "#ffffffaa", size = "sm" }
            }
        },
        body = new
        {
            type = "box", layout = "vertical", spacing = "sm", paddingAll = "16px",
            contents = new object[]
            {
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "พนักงาน", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = employeeName, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "ประเภท", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = leaveTypeName, size = "sm", color = "#111111", flex = 5 }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "วันที่", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = dateRange, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "จำนวน", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = $"{totalDays} วัน", size = "sm", color = "#111111", flex = 5 }
                    }
                },
                !string.IsNullOrWhiteSpace(reason)
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = "เหตุผล", size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = reason, size = "sm", color = "#111111", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "sm" },
                priorApproverName is not null
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = "หัวหน้าอนุมัติ", size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = $"✅ {priorApproverName}", size = "sm", color = "#1DB446", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "xs" },
                attachmentCount > 0
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = "เอกสารแนบ", size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = $"📎 มีเอกสารแนบ {attachmentCount} ไฟล์", size = "sm", color = "#1E6FBA", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "xs" }
            }
        },
        footer = new
        {
            type = "box", layout = "horizontal", spacing = "sm", paddingAll = "12px",
            contents = new object[]
            {
                new
                {
                    type = "button", style = "primary", color = "#1DB446", flex = 1,
                    action = new { type = "postback", label = "อนุมัติ", data = approveData, displayText = "อนุมัติคำขอลางาน" }
                },
                new
                {
                    type = "button", style = "primary", color = "#E74C3C", flex = 1,
                    action = new { type = "postback", label = "ปฏิเสธ", data = rejectData, displayText = "ปฏิเสธคำขอลางาน" }
                }
            }
        }
    };

    private static object BuildResultCard(
        string leaveTypeName, string dateRange, decimal totalDays, bool approved,
        string? approverName, string? comment) => new
    {
        type = "bubble",
        header = new
        {
            type = "box", layout = "vertical", paddingAll = "16px",
            backgroundColor = approved ? "#1DB446" : "#E74C3C",
            contents = new object[]
            {
                new
                {
                    type = "text",
                    text = approved ? "คำขอลางานได้รับอนุมัติ" : "คำขอลางานถูกปฏิเสธ",
                    color = "#ffffff", size = "md", weight = "bold"
                }
            }
        },
        body = new
        {
            type = "box", layout = "vertical", spacing = "sm", paddingAll = "16px",
            contents = new object[]
            {
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "ประเภท", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = leaveTypeName, size = "sm", color = "#111111", flex = 5 }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "วันที่", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = dateRange, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = "จำนวน", size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = $"{totalDays} วัน", size = "sm", color = "#111111", flex = 5 }
                    }
                },
                approverName is not null
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = "ผู้อนุมัติ", size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = approverName, size = "sm", color = "#111111", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "sm" },
                !string.IsNullOrWhiteSpace(comment)
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = "หมายเหตุ", size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = comment, size = "sm", color = "#111111", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "sm" }
            }
        }
    };
}
