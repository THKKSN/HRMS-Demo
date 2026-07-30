using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Constants;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Jobs;

public class DailyAttendanceReportJob(IApplicationDbContext db, ILineMessagingService line)
{
    private static readonly string[] ThaiMonths =
    [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    private static readonly string[] ThaiDaysOfWeek =
    [
        "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ",
        "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
    ];

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
        var executiveLineIds = await db.EmployeeRoles
            .Include(r => r.Employee)
            .Where(r =>
                r.RoleId == SystemRoleIds.Executive &&
                r.IsActive &&
                r.Employee.IsActive &&
                r.Employee.CompanyId == companyId &&
                r.Employee.LineUserId != null)
            .Select(r => r.Employee.LineUserId!)
            .Distinct()
            .ToListAsync(ct);

        if (executiveLineIds.Count == 0) return;

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

        var thaiDate  = FormatThaiDate(today);
        var altText   = $"สรุปการเข้างาน {companyName} {thaiDate}";
        var card = BuildReportCard(
            companyName, thaiDate, totalEmployees,
            checkInCount, lateCount, leaveOnlyCount, notRecordedCount,
            absentList.Select(e => $"{e.FirstName} {e.LastName}".Trim()).ToList());

        foreach (var lineUserId in executiveLineIds)
        {
            try { await line.PushFlexMessageAsync(lineUserId, altText, card, ct); }
            catch { /* ไม่ให้ job ล้มเหลวถ้า push คนใดคนหนึ่งไม่ได้ */ }
        }
    }

    private static string FormatThaiDate(DateOnly date)
    {
        var dow          = ThaiDaysOfWeek[(int)date.DayOfWeek];
        var month        = ThaiMonths[date.Month - 1];
        var buddhistYear = date.Year + 543;
        return $"{dow}ที่ {date.Day} {month} {buddhistYear}";
    }

    private static object BuildReportCard(
        string companyName, string thaiDate,
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
                    new { type = "text", text = "เข้างาน", size = "sm", color = "#1DB446", flex = 5 },
                    new { type = "text", text = $"{checkIn}/{total} คน", size = "sm", color = "#111111", flex = 3, align = "end", weight = "bold" }
                }
            },
            new { type = "separator", margin = "sm" },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = "มาสาย", size = "sm", color = "#888888", flex = 5 },
                    new { type = "text", text = $"{late} คน", size = "sm", color = late > 0 ? "#E8A219" : "#888888", flex = 3, align = "end" }
                }
            },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = "ลา", size = "sm", color = "#888888", flex = 5 },
                    new { type = "text", text = $"{onLeave} คน", size = "sm", color = "#7B61FF", flex = 3, align = "end" }
                }
            },
            new
            {
                type = "box", layout = "horizontal", spacing = "none", margin = "sm",
                contents = new object[]
                {
                    new { type = "text", text = "ไม่ได้เช็คอิน", size = "sm", color = "#888888", flex = 5 },
                    new
                    {
                        type = "text",
                        text = $"{notRecorded} คน",
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
                type = "text", text = "รายชื่อที่ยังไม่ได้เช็คอิน",
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
                    text = $"และอีก {notRecorded - absentNames.Count} คน",
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
                    new { type = "text", text = "สรุปการเข้างาน", color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = companyName, color = "#ffffffcc", size = "sm", margin = "xs" },
                    new { type = "text", text = thaiDate, color = "#ffffff88", size = "xs", margin = "xs" }
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
