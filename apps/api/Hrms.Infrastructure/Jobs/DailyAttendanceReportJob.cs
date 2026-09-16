using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using Hrms.Domain.Constants;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Jobs;

public class DailyAttendanceReportJob(
    IApplicationDbContext db,
    ILineMessagingService line,
    ILineMessageTextFactory messageText)
{
    public async Task SendDailyReportAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        var companies = await db.Companies
            .Where(c => c.IsActive)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(ct);

        foreach (var company in companies)
            await ProcessCompanyAsync(company.Id, company.Name, today, ct);
    }

    private async Task ProcessCompanyAsync(Guid companyId, string companyName, DateOnly today, CancellationToken ct)
    {
        // ดึงภาษาของผู้รับมาด้วย — การ์ดต้องประกอบใหม่ต่อคน (แผน notification-i18n งาน N3.1)
        var executives = await db.EmployeeRoles
            .Include(r => r.Employee)
            .Where(r =>
                r.RoleId == SystemRoleIds.Executive &&
                r.IsActive &&
                r.Employee.IsActive &&
                r.Employee.CompanyId == companyId &&
                r.Employee.LineUserId != null)
            .Select(r => new { LineUserId = r.Employee.LineUserId!, r.Employee.PreferredLanguage })
            .Distinct()
            .ToListAsync(ct);

        if (executives.Count == 0) return;

        var totalEmployees = await db.Employees
            .CountAsync(e => e.CompanyId == companyId && e.IsActive, ct);

        var records = await db.AttendanceRecords
            .Where(r => r.Employee.CompanyId == companyId && r.Date == today)
            .Select(r => new { r.EmployeeId, r.Status, r.IsLate })
            .ToListAsync(ct);

        var recordedIds = records.Select(r => r.EmployeeId).ToList();

        var onLeaveIds = await db.LeaveRequests
            .Where(l =>
                l.Employee.CompanyId == companyId &&
                l.Status == LeaveStatus.Approved &&
                l.DateFrom <= today && l.DateTo >= today)
            .Select(l => l.EmployeeId)
            .Distinct()
            .ToListAsync(ct);

        var onLeaveSet    = onLeaveIds.ToHashSet();
        var recordedSet   = recordedIds.ToHashSet();
        var presentCount  = records.Count(r => r.Status == AttendanceStatus.Present);
        var lateCount     = records.Count(r => r.IsLate);
        var halfDayCount  = records.Count(r => r.Status == AttendanceStatus.HalfDay);
        var checkInCount  = presentCount + lateCount + halfDayCount;
        var leaveOnlyCount = onLeaveSet.Count(id => !recordedSet.Contains(id));
        var notRecordedCount = Math.Max(0, totalEmployees - recordedSet.Count - leaveOnlyCount);

        var absentList = await db.Employees
            .Where(e =>
                e.CompanyId == companyId &&
                e.IsActive &&
                !recordedIds.Contains(e.Id) &&
                !onLeaveIds.Contains(e.Id))
            .OrderBy(e => e.FirstName)
            .Take(5)
            .Select(e => new { e.FirstName, e.LastName })
            .ToListAsync(ct);

        var absentNames = absentList.Select(e => $"{e.FirstName} {e.LastName}".Trim()).ToList();

        // ประกอบการ์ดใหม่ต่อผู้รับหนึ่งคน — เดิมประกอบใบเดียวนอกลูปแล้วส่งให้ทุกคน
        // ซึ่งทำให้ส่งคนละภาษาตามผู้รับไม่ได้เลย (แผน notification-i18n งาน N2)
        foreach (var executive in executives)
        {
            var text = messageText.For(executive.PreferredLanguage);
            var reportDate = FormatReportDate(today, text);
            var altText = text.Of("attendance.report.altText", new { company = companyName, date = reportDate });
            var card = BuildReportCard(
                text, companyName, reportDate, totalEmployees,
                checkInCount, lateCount, leaveOnlyCount, notRecordedCount, absentNames);
            try { await line.PushFlexMessageAsync(executive.LineUserId, altText, card, ct); }
            catch { /* ไม่ให้ job ล้มเหลวถ้า push คนใดคนหนึ่งไม่ได้ */ }
        }
    }

    /// <summary>
    /// เดิมประกอบเองด้วย array ชื่อเดือน/ชื่อวันภาษาไทย — ตอนนี้ชื่อมาจาก <see cref="AppDateFormat"/>
    /// ส่วนรูปประโยค ("วันอังคาร<b>ที่</b> …") อยู่ในไฟล์คำแปล เพราะแต่ละภาษาเรียงไม่เหมือนกัน
    /// </summary>
    private static string FormatReportDate(DateOnly date, MessageText text)
        => text.Of("attendance.report.date", new
        {
            dayOfWeek = AppDateFormat.DayOfWeek(date, text.Locale),
            date = AppDateFormat.LongDate(date, text.Locale),
        });

    private static object BuildReportCard(
        MessageText text,
        string companyName, string reportDate,
        int total, int checkIn, int late, int onLeave, int notRecorded,
        List<string> absentNames)
    {
        var bodyContents = new List<object>
        {
            new
            {
                type = "box", layout = "horizontal", spacing = "none",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.report.checkedIn"), size = "sm", color = "#1DB446", flex = 5 },
                    new { type = "text", text = text.Of("attendance.report.ofTotalPeople", new { count = checkIn, total }), size = "sm", color = "#111111", flex = 3, align = "end", weight = "bold" }
                }
            },
            new { type = "separator", margin = "sm" },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.report.late"), size = "sm", color = "#888888", flex = 5 },
                    new { type = "text", text = text.Of("attendance.report.people", new { count = late }), size = "sm", color = late > 0 ? "#E8A219" : "#888888", flex = 3, align = "end" }
                }
            },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.report.onLeave"), size = "sm", color = "#888888", flex = 5 },
                    new { type = "text", text = text.Of("attendance.report.people", new { count = onLeave }), size = "sm", color = "#7B61FF", flex = 3, align = "end" }
                }
            },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.report.notCheckedIn"), size = "sm", color = "#888888", flex = 5 },
                    new
                    {
                        type = "text",
                        text = text.Of("attendance.report.people", new { count = notRecorded }),
                        size = "sm",
                        color = notRecorded > 0 ? "#E74C3C" : "#888888",
                        flex = 3,
                        align = "end",
                        weight = notRecorded > 0 ? "bold" : "regular"
                    }
                }
            }
        };

        if (absentNames.Count > 0)
        {
            bodyContents.Add(new { type = "separator", margin = "md" });
            bodyContents.Add(new
            {
                type = "text", text = text.Of("attendance.report.notCheckedInNames"),
                size = "xs", color = "#888888", margin = "md"
            });
            foreach (var name in absentNames)
            {
                bodyContents.Add(new
                {
                    type = "text", text = $"• {name}",
                    size = "xs", color = "#555555", margin = "xs"
                });
            }
            if (notRecorded > absentNames.Count)
            {
                bodyContents.Add(new
                {
                    type = "text",
                    text = text.Of("attendance.report.andMorePeople", new { count = notRecorded - absentNames.Count }),
                    size = "xs", color = "#aaaaaa", margin = "xs"
                });
            }
        }

        return new
        {
            type = "bubble",
            size = "kilo",
            header = new
            {
                type = "box", layout = "vertical", paddingAll = "16px",
                backgroundColor = "#1A3A5C",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.report.title"), color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = companyName, color = "#ffffffcc", size = "sm", margin = "xs" },
                    new { type = "text", text = reportDate, color = "#ffffff88", size = "xs", margin = "xs" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "none", paddingAll = "16px",
                contents = bodyContents.ToArray()
            }
        };
    }
}
