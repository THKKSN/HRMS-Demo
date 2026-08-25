namespace Hrms.Application.Common.Helpers;

public static class LineFlexBuilder
{
    public static object BuildTicketNotificationCard(
        string message, string ticketUrl)
    {
        var lines = message
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var title = lines.FirstOrDefault() ?? "อัปเดตใบแจ้งเรื่อง";
        var style = ResolveTicketStyle(message);
        var detailContents = new List<object>();

        foreach (var line in lines.Skip(1))
        {
            var separatorIndex = line.IndexOf(':');
            if (separatorIndex > 0)
            {
                detailContents.Add(new
                {
                    type = "box",
                    layout = "horizontal",
                    spacing = "md",
                    contents = new object[]
                    {
                        new
                        {
                            type = "text",
                            text = line[..separatorIndex].Trim(),
                            size = "sm",
                            color = "#7A7F87",
                            flex = 2,
                            wrap = true
                        },
                        new
                        {
                            type = "text",
                            text = line[(separatorIndex + 1)..].Trim(),
                            size = "sm",
                            color = "#22252A",
                            weight = "bold",
                            flex = 3,
                            wrap = true
                        }
                    }
                });
            }
            else
            {
                detailContents.Add(new
                {
                    type = "text",
                    text = line,
                    size = "sm",
                    color = "#4E535A",
                    wrap = true
                });
            }
        }

        if (detailContents.Count == 0)
        {
            detailContents.Add(new
            {
                type = "text",
                text = "แตะปุ่มด้านล่างเพื่อตรวจสอบรายละเอียด",
                size = "sm",
                color = "#7A7F87",
                wrap = true
            });
        }

        return new
        {
            type = "bubble",
            size = "mega",
            styles = new
            {
                header = new { backgroundColor = "#FFFFFF" },
                body = new { backgroundColor = "#FFFFFF" },
                footer = new { backgroundColor = "#F7F8FA", separator = true }
            },
            header = new
            {
                type = "box",
                layout = "vertical",
                paddingAll = "0px",
                contents = new object[]
                {
                    new
                    {
                        type = "box",
                        layout = "vertical",
                        height = "6px",
                        backgroundColor = style.AccentColor,
                        contents = new object[] { new { type = "filler" } }
                    },
                    new
                    {
                        type = "box",
                        layout = "horizontal",
                        paddingStart = "20px",
                        paddingEnd = "20px",
                        paddingTop = "16px",
                        paddingBottom = "8px",
                        alignItems = "center",
                        contents = new object[]
                        {
                            new
                            {
                                type = "text",
                                text = "TBG Assistant  ·  INTERNAL TICKET",
                                size = "xs",
                                color = "#71767E",
                                weight = "bold",
                                flex = 1
                            },
                            new
                            {
                                type = "box",
                                layout = "vertical",
                                backgroundColor = style.BadgeColor,
                                cornerRadius = "12px",
                                paddingStart = "10px",
                                paddingEnd = "10px",
                                paddingTop = "4px",
                                paddingBottom = "4px",
                                flex = 0,
                                contents = new object[]
                                {
                                    new
                                    {
                                        type = "text",
                                        text = style.Label,
                                        size = "xs",
                                        color = style.AccentColor,
                                        weight = "bold",
                                        align = "center"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            body = new
            {
                type = "box",
                layout = "vertical",
                paddingStart = "20px",
                paddingEnd = "20px",
                paddingTop = "8px",
                paddingBottom = "20px",
                spacing = "md",
                contents = new object[]
                {
                    new
                    {
                        type = "text",
                        text = title,
                        size = "lg",
                        color = "#17191C",
                        weight = "bold",
                        wrap = true
                    },
                    new
                    {
                        type = "box",
                        layout = "horizontal",
                        alignItems = "center",
                        contents = new object[]
                        {
                            new
                            {
                                type = "box",
                                layout = "vertical",
                                width = "8px",
                                height = "8px",
                                cornerRadius = "4px",
                                backgroundColor = style.AccentColor,
                                contents = new object[] { new { type = "filler" } }
                            },
                            new
                            {
                                type = "text",
                                text = $"อัปเดตเมื่อ {DateTime.UtcNow.AddHours(7):dd/MM/yyyy HH:mm} น.",
                                margin = "sm",
                                size = "xs",
                                color = "#8A8F98"
                            }
                        }
                    },
                    new { type = "separator", color = "#E8EAED" },
                    new
                    {
                        type = "box",
                        layout = "vertical",
                        spacing = "sm",
                        contents = detailContents.ToArray()
                    }
                }
            },
            footer = new
            {
                type = "box",
                layout = "vertical",
                paddingAll = "12px",
                contents = new object[]
                {
                    new
                    {
                        type = "button",
                        height = "sm",
                        style = "primary",
                        color = style.AccentColor,
                        action = new
                        {
                            type = "uri",
                            label = "เปิดดูรายละเอียด",
                            uri = ticketUrl
                        }
                    }
                }
            }
        };
    }

    private static TicketCardStyle ResolveTicketStyle(string message)
    {
        if (message.Contains("ปฏิเสธ") || message.Contains("ถูกยุติ"))
            return new("#C63C3C", "#FCEBEC", "ยุติรายการ");
        if (message.Contains("คำขอยกเลิก") && message.Contains("ไม่ได้รับอนุมัติ"))
            return new("#C63C3C", "#FCEBEC", "ไม่อนุมัติ");
        if (message.Contains("คำขอยกเลิก") && message.Contains("อนุมัติ"))
            return new("#5B6472", "#EEF0F3", "ยกเลิกแล้ว");
        if (message.Contains("คำขอยกเลิก") || message.Contains("ขอยกเลิก"))
            return new("#B7791F", "#FFF6DE", "รอพิจารณา");
        if (message.Contains("ส่งกลับ") || message.Contains("ขอข้อมูล"))
            return new("#B7791F", "#FFF6DE", "ต้องดำเนินการ");
        if (message.Contains("ผ่านการตรวจ") || message.Contains("ปิดแล้ว"))
            return new("#17855B", "#E7F7F0", "ปิดงานแล้ว");
        if (message.Contains("รอตรวจ"))
            return new("#087EA4", "#E5F6FB", "รอตรวจรับ");
        if (message.Contains("เริ่มดำเนินการ") || message.Contains("กลับมาดำเนินการ"))
            return new("#1267A5", "#E8F2FA", "กำลังดำเนินการ");
        if (message.Contains("มอบหมาย") || message.Contains("ผู้รับผิดชอบ") || message.Contains("รับเรื่อง"))
            return new("#3563C9", "#EBF0FC", "มอบหมายแล้ว");
        if (message.Contains("ข้อความใหม่"))
            return new("#5B6472", "#EEF0F3", "ข้อความใหม่");

        return new("#0F8F72", "#E5F6F1", "งานใหม่");
    }

    private sealed record TicketCardStyle(
        string AccentColor,
        string BadgeColor,
        string Label);

    public static object BuildOtpCard(string otpCode, string otpUrl)
    {
        return new
        {
            type = "bubble",
            size = "kompact",
            styles = new
            {
                header = new { backgroundColor = "#0F8F72" },
                footer = new { backgroundColor = "#F7F8FA", separator = true }
            },
            header = new
            {
                type = "box",
                layout = "vertical",
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = "รหัส OTP เชื่อมบัญชี", color = "#ffffff", size = "md", weight = "bold" }
                }
            },
            body = new
            {
                type = "box",
                layout = "vertical",
                spacing = "sm",
                paddingAll = "20px",
                contents = new object[]
                {
                    new
                    {
                        type = "text",
                        text = otpCode,
                        size = "3xl",
                        weight = "bold",
                        align = "center",
                        color = "#17191C",
                        margin = "sm"
                    },
                    new
                    {
                        type = "text",
                        text = "ใช้ได้ภายใน 5 นาที ห้ามแชร์รหัสนี้กับผู้อื่น",
                        size = "xs",
                        color = "#7A7F87",
                        align = "center",
                        wrap = true,
                        margin = "md"
                    }
                }
            },
            footer = new
            {
                type = "box",
                layout = "vertical",
                paddingAll = "12px",
                contents = new object[]
                {
                    new
                    {
                        type = "button",
                        height = "sm",
                        style = "primary",
                        color = "#0F8F72",
                        action = new
                        {
                            type = "uri",
                            label = "กลับไปกรอกรหัส",
                            uri = otpUrl
                        }
                    }
                }
            }
        };
    }

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
