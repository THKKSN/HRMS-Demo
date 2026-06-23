namespace Hrms.Application.Common.Helpers;

public static class LineFlexBuilder
{
    public static object BuildAttendancePromptCard(
        string name, bool isCheckIn, string? checkInTime = null)
    {
        var headerColor  = isCheckIn ? "#1DB446" : "#0C7BB3";
        var headerTitle  = isCheckIn ? "เช็คอินเริ่มงาน" : "เช็คเอาต์ออกงาน";
        var headerIcon   = isCheckIn ? "🟢" : "🔵";
        var bodyText     = isCheckIn
            ? "ยังไม่ได้เช็คอินวันนี้"
            : $"เช็คอินแล้ว {checkInTime} น.";
        var buttonLabel  = isCheckIn ? "📍 แชร์ตำแหน่งเพื่อเช็คอิน" : "📍 แชร์ตำแหน่งเพื่อเช็คเอาต์";

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = headerColor,
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = $"{headerIcon} {headerTitle}", color = "#ffffff", size = "md", weight = "bold" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "sm", paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = name, weight = "bold", size = "lg" },
                    new { type = "text", text = bodyText, size = "sm", color = "#555555", margin = "sm" }
                }
            },
            footer = new
            {
                type = "box", layout = "vertical", paddingAll = "12px",
                backgroundColor = "#f5f5f5",
                contents = new object[]
                {
                    new { type = "text", text = buttonLabel, size = "sm", color = headerColor, align = "center", weight = "bold" }
                }
            }
        };
    }


    public static object BuildCheckInResultCard(
        string name, DateTime time, string locationName, bool isLate, int lateMinutes)
    {
        var headerColor = isLate ? "#FF8C00" : "#1DB446";
        var statusText  = isLate ? $"มาสาย {lateMinutes} นาที" : "มาทำงานตรงเวลา ✅";

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = headerColor,
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = "เช็คอินสำเร็จ", color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = time.ToString("HH:mm") + " น.", color = "#ffffffcc", size = "sm" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "sm",
                contents = new object[]
                {
                    new { type = "text", text = name, weight = "bold", size = "lg" },
                    new { type = "text", text = statusText, color = isLate ? "#FF8C00" : "#1DB446", size = "sm" },
                    new { type = "separator", margin = "md" },
                    new
                    {
                        type = "box", layout = "horizontal", margin = "md",
                        contents = new object[]
                        {
                            new { type = "text", text = "สถานที่", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = locationName, size = "sm", flex = 3, align = "end", wrap = true }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = "เวลาเข้า", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = time.ToString("HH:mm") + " น.", size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }

    public static object BuildCheckOutResultCard(
        string name, DateTime checkInTime, DateTime checkOutTime, string locationName)
    {
        var worked = checkOutTime - checkInTime;
        var workedText = $"{(int)worked.TotalHours} ชม. {worked.Minutes} นาที";

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = "#0C7BB3",
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = "เช็คเอาต์สำเร็จ", color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = checkOutTime.ToString("HH:mm") + " น.", color = "#ffffffcc", size = "sm" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "sm",
                contents = new object[]
                {
                    new { type = "text", text = name, weight = "bold", size = "lg" },
                    new { type = "text", text = $"ทำงาน {workedText}", color = "#0C7BB3", size = "sm" },
                    new { type = "separator", margin = "md" },
                    new
                    {
                        type = "box", layout = "horizontal", margin = "md",
                        contents = new object[]
                        {
                            new { type = "text", text = "สถานที่", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = locationName, size = "sm", flex = 3, align = "end", wrap = true }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = "เข้างาน", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkInTime.ToString("HH:mm") + " น.", size = "sm", flex = 3, align = "end" }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = "ออกงาน", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkOutTime.ToString("HH:mm") + " น.", size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }

    public static object BuildAttendanceTodayCard(
        string name, string date, string? checkIn, string? checkOut, string status)
    {
        var statusColor = status switch
        {
            "Present" => "#1DB446",
            "Late"    => "#FF8C00",
            "Absent"  => "#E74C3C",
            _         => "#AAAAAA"
        };
        var statusLabel = status switch
        {
            "Present" => "✅ มาทำงาน",
            "Late"    => "⚠️ มาสาย",
            "Absent"  => "❌ ขาดงาน",
            _         => "— ยังไม่ลงเวลา"
        };

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = "#0C7BB3",
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = "สถานะการเข้างานวันนี้", color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = date, color = "#ffffffcc", size = "sm" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "sm",
                contents = new object[]
                {
                    new { type = "text", text = name, weight = "bold", size = "lg" },
                    new { type = "text", text = statusLabel, color = statusColor, size = "sm" },
                    new { type = "separator", margin = "md" },
                    new
                    {
                        type = "box", layout = "horizontal", margin = "md",
                        contents = new object[]
                        {
                            new { type = "text", text = "เข้างาน", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkIn is not null ? checkIn + " น." : "—", size = "sm", flex = 3, align = "end" }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = "ออกงาน", size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkOut is not null ? checkOut + " น." : "—", size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }
}
