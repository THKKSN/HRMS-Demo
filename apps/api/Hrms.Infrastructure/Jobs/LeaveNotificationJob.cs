using System.Text.Json;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using Hrms.Domain.Enums;
using Hrms.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Jobs;

public class LeaveNotificationJob(
    IApplicationDbContext db,
    ILineMessagingService line,
    ILineMessageTextFactory messageText)
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


        var approveData = $"action=approve&leaveId={request.Id}";
        var rejectData  = $"action=reject&leaveId={request.Id}";

        // ดึงภาษาของผู้รับมาด้วย — การ์ดต้องประกอบใหม่ต่อคน (แผน notification-i18n งาน N3.1)
        var recipients = await db.EmployeeRoles
            .Include(r => r.Employee)
            .Where(r =>
                r.RoleId   == targetRoleId &&
                r.IsActive &&
                r.Employee.IsActive &&
                r.Employee.CompanyId  == companyId &&
                r.Employee.LineUserId != null)
            .Select(r => new { LineUserId = r.Employee.LineUserId!, r.Employee.PreferredLanguage })
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

        // ประกอบการ์ดใหม่ต่อผู้รับหนึ่งคน — เดิมประกอบใบเดียวนอกลูปแล้วส่งให้ทุกคน
        // ซึ่งทำให้ส่งคนละภาษาตามผู้รับไม่ได้เลย (แผน notification-i18n งาน N2)
        foreach (var recipient in recipients)
        {
            var text = messageText.For(recipient.PreferredLanguage);
            var leaveTypeName = LeaveTypeName(request.LeaveType, text.Locale);
            var altText = text.Of("leave.pending.altText", new
            {
                employee = employeeName,
                leaveType = leaveTypeName,
                dateRange,
                days = request.TotalDays,
            });
            var card = BuildApprovalCard(text, employeeName, leaveTypeName, dateRange,
                request.TotalDays, request.Reason, attachmentCount, priorApproverName, approveData, rejectData);
            try
            {
                await line.PushFlexMessageAsync(recipient.LineUserId, altText, card);
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
        if (request.Status is not (LeaveStatus.Approved or LeaveStatus.Rejected)) return;

        var approved      = request.Status == LeaveStatus.Approved;
        var text          = messageText.For(request.Employee.PreferredLanguage);
        var leaveTypeName = LeaveTypeName(request.LeaveType, text.Locale);
        var altText       = text.Of(approved ? "leave.result.approvedAltText" : "leave.result.rejectedAltText", new
        {
            leaveType = leaveTypeName,
            dateRange = $"{request.DateFrom:dd/MM/yyyy}–{request.DateTo:dd/MM/yyyy}",
        });

        var dateRange = $"{request.DateFrom:dd/MM/yyyy} – {request.DateTo:dd/MM/yyyy}";

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
            text, leaveTypeName, dateRange, request.TotalDays, approved,
            finalApproverName, request.HrComment ?? request.SupervisorComment);

        try { await line.PushFlexMessageAsync(request.Employee.LineUserId, altText, resultCard); }
        catch { /* เงียบๆ ข้าม ถ้า push ไม่ได้ */ }
    }

    /// <summary>ชื่อประเภทการลาที่ HR กรอกไว้หลายภาษาตั้งแต่ Phase M — เลิกอ่าน <c>NameTh</c> ตรง ๆ</summary>
    private static string LeaveTypeName(Domain.Entities.LeaveType leaveType, string locale)
        => LocalizedName.For(leaveType.NameTh, leaveType.NameEn, leaveType.NameId, locale);

    private static int CountAttachments(string? attachmentUrl)
    {
        if (string.IsNullOrWhiteSpace(attachmentUrl)) return 0;
        try { return JsonSerializer.Deserialize<List<string>>(attachmentUrl)?.Count ?? 0; }
        catch { return 1; }
    }

    private static object BuildApprovalCard(
        MessageText text,
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
                new { type = "text", text = text.Of("leave.pending.title"), color = "#ffffff", size = "md", weight = "bold" },
                new { type = "text", text = text.Of("leave.pending.subtitle"), color = "#ffffffaa", size = "sm" }
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
                        new { type = "text", text = text.Of("leave.field.employee"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = employeeName, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = text.Of("leave.field.type"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = leaveTypeName, size = "sm", color = "#111111", flex = 5 }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = text.Of("leave.field.dates"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = dateRange, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = text.Of("leave.field.days"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = text.Of("leave.value.days", new { days = totalDays }), size = "sm", color = "#111111", flex = 5 }
                    }
                },
                !string.IsNullOrWhiteSpace(reason)
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("leave.field.reason"), size = "sm", color = "#888888", flex = 3 },
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
                            new { type = "text", text = text.Of("leave.field.supervisorApproved"), size = "sm", color = "#888888", flex = 3 },
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
                            new { type = "text", text = text.Of("leave.field.attachments"), size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = text.Of("leave.value.attachments", new { count = attachmentCount }), size = "sm", color = "#1E6FBA", flex = 5, wrap = true }
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
                    action = new
                    {
                        type = "postback",
                        label = text.Of("leave.action.approve"),
                        data = approveData,
                        // displayText คือสิ่งที่โผล่ในห้องแชทของผู้กด จึงต้องเป็นภาษาของผู้กดเช่นกัน
                        displayText = text.Of("leave.action.approveDisplayText")
                    }
                },
                new
                {
                    type = "button", style = "primary", color = "#E74C3C", flex = 1,
                    action = new
                    {
                        type = "postback",
                        label = text.Of("leave.action.reject"),
                        data = rejectData,
                        displayText = text.Of("leave.action.rejectDisplayText")
                    }
                }
            }
        }
    };

    private static object BuildResultCard(
        MessageText text,
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
                    text = text.Of(approved ? "leave.result.approvedTitle" : "leave.result.rejectedTitle"),
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
                        new { type = "text", text = text.Of("leave.field.type"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = leaveTypeName, size = "sm", color = "#111111", flex = 5 }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = text.Of("leave.field.dates"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = dateRange, size = "sm", color = "#111111", flex = 5, wrap = true }
                    }
                },
                new
                {
                    type = "box", layout = "horizontal",
                    contents = new object[]
                    {
                        new { type = "text", text = text.Of("leave.field.days"), size = "sm", color = "#888888", flex = 3 },
                        new { type = "text", text = text.Of("leave.value.days", new { days = totalDays }), size = "sm", color = "#111111", flex = 5 }
                    }
                },
                approverName is not null
                    ? (object)new
                    {
                        type = "box", layout = "horizontal", margin = "sm",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("leave.field.approver"), size = "sm", color = "#888888", flex = 3 },
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
                            new { type = "text", text = text.Of("leave.field.comment"), size = "sm", color = "#888888", flex = 3 },
                            new { type = "text", text = comment, size = "sm", color = "#111111", flex = 5, wrap = true }
                        }
                    }
                    : new { type = "separator", margin = "sm" }
            }
        }
    };
}
