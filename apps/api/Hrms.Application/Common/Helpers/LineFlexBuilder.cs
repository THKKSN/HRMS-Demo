using Hrms.Application.Common.Localization;

namespace Hrms.Application.Common.Helpers;

public static class LineFlexBuilder
{
    /// <param name="eventType">
    /// <see cref="Hrms.Domain.Entities.NotificationOutbox.EventType"/> ของแถวที่กำลังส่ง — ใช้เลือกสี/ป้ายหัวการ์ด
    /// </param>
    /// <param name="text">
    /// ตัวแปลที่ผูกภาษาผู้รับไว้แล้ว · ตัวเนื้อความแปลมาจาก payload ตั้งแต่ก่อนเข้ามา
    /// ส่วนคำบนกรอบการ์ด (ป้ายสถานะ, ปุ่ม, บรรทัดเวลา) เป็นของ builder เอง จึงต้องแปลตรงนี้
    /// </param>
    public static object BuildTicketNotificationCard(
        string message,
        string ticketUrl,
        string eventType,
        MessageText text,
        string productLabel = "INTERNAL TICKET")
    {
        var lines = message
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var title = lines.FirstOrDefault() ?? text.Of("card.fallbackTitle");
        var style = ResolveTicketStyle(eventType);
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
                text = text.Of("card.noDetailHint"),
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
                                text = $"TBG Assistant  ·  {productLabel}",
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
                                        text = text.Of(style.LabelKey),
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
                                // เวลาเป็นเวลาไทยทุกภาษา (ตรึง Asia/Bangkok) — คำว่า "น." ท้ายเวลา
                                // อยู่ในคำแปลของแต่ละภาษา ไม่ใช่ในโค้ด ตามกติกาใน GLOSSARY
                                text = text.Of("card.updatedAt", new
                                {
                                    time = $"{DateTime.UtcNow.AddHours(7):dd/MM/yyyy HH:mm}"
                                }),
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
                            label = text.Of("card.openButton"),
                            uri = ticketUrl
                        }
                    }
                }
            }
        };
    }

    /// <summary>
    /// สี/ป้ายหัวการ์ดตาม <b>เหตุการณ์</b> ที่เกิด ไม่ใช่ตามเนื้อข้อความ
    ///
    /// <para>
    /// ของเดิมเดาจากคำในข้อความ (<c>message.Contains("ปฏิเสธ")</c> 15 เงื่อนไข) ซึ่งมี 2 ปัญหา:
    /// (1) ใช้ได้ภาษาเดียว — ข้อความไม่ใช่ไทยเมื่อไหร่ ทุกใบตกเป็น "งานใหม่"
    /// (2) เนื้อข้อความมีข้อความที่ผู้ใช้พิมพ์เองปนอยู่ (คอมเมนต์ เหตุผล ชื่อขั้นตอน)
    /// — ผู้ใช้พิมพ์คำว่า "ปฏิเสธ" ในคอมเมนต์แล้วการ์ดเปลี่ยนเป็นสีแดงได้
    /// </para>
    /// <para>
    /// <b>เพิ่ม event ใหม่ต้องมาเพิ่มที่นี่ด้วย</b> ไม่งั้นได้สไตล์ default — มี test คุมอยู่ที่
    /// <c>LineFlexBuilderStyleTests</c>
    /// </para>
    /// </summary>
    public static TicketCardStyle ResolveTicketStyle(string? eventType) => eventType switch
    {
        "TicketRejected" => new("#C63C3C", "#FCEBEC", "card.badge.stopped"),
        "TicketCancellationRejected" or "MemoRejected" or "MemoStepRejected"
            => new("#C63C3C", "#FCEBEC", "card.badge.notApproved"),
        "TicketCancelled" => new("#5B6472", "#EEF0F3", "card.badge.cancelled"),
        "TicketCancellationRequested" => new("#B7791F", "#FFF6DE", "card.badge.pendingReview"),
        "MemoApproved" or "MemoDelivered" => new("#17855B", "#E7F7F0", "card.badge.approved"),
        "MemoSubmitted" => new("#B7791F", "#FFF6DE", "card.badge.pendingApproval"),
        "TicketResolved" or "MemoDeliveredToRequester" => new("#087EA4", "#E5F6FB", "card.badge.awaitingAcceptance"),
        "TicketReturned" or "TicketWaitingInfo" => new("#B7791F", "#FFF6DE", "card.badge.actionRequired"),
        // TicketRequesterConfirmed เดิมตกเป็นป้าย "งานใหม่" เพราะข้อความว่า "ยืนยันปิดงาน" ไม่ตรงกับคำใดเลย
        "TicketClosed" or "TicketRequesterConfirmed" => new("#17855B", "#E7F7F0", "card.badge.closed"),
        "TicketStarted" => new("#1267A5", "#E8F2FA", "card.badge.inProgress"),
        // TicketTeamMemberAdded เดิมได้ 2 สีในเหตุการณ์เดียวกัน — คนที่ถูกดึงเข้าได้สีนี้ (ข้อความมีคำว่า
        // "ผู้รับผิดชอบหลัก:") ส่วนทีมเดิมตกเป็นป้าย "งานใหม่" · รวมเป็นสีเดียวเพราะเป็นเหตุการณ์เดียวกัน
        "TicketAccepted" or "TicketAssigned" or "TicketReassigned" or "TicketClaimed"
            or "TicketTeamMemberAdded" => new("#3563C9", "#EBF0FC", "card.badge.assigned"),
        "TicketCommented" => new("#5B6472", "#EEF0F3", "card.badge.newMessage"),
        _ => new("#0F8F72", "#E5F6F1", "card.badge.newTicket"),
    };

    public sealed record TicketCardStyle(
        string AccentColor,
        string BadgeColor,
        string LabelKey);

    public static object BuildAttendancePromptCard(
        MessageText text, string name, bool isCheckIn, string? checkInTime = null)
    {
        var headerColor  = isCheckIn ? "#1DB446" : "#0C7BB3";
        var headerTitle  = text.Of(isCheckIn ? "attendance.checkIn.title" : "attendance.checkOut.title");
        var headerIcon   = isCheckIn ? "🟢" : "🔵";
        var bodyText     = isCheckIn
            ? text.Of("attendance.prompt.notCheckedInYet")
            : text.Of("attendance.prompt.checkedInAt", new { time = checkInTime });
        var buttonLabel  = text.Of(isCheckIn ? "attendance.prompt.shareForCheckIn" : "attendance.prompt.shareForCheckOut");

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
        MessageText text, string name, DateTime time, string locationName, bool isLate, int lateMinutes)
    {
        var headerColor = isLate ? "#FF8C00" : "#1DB446";
        var statusText  = isLate
            ? text.Of("attendance.checkIn.lateBy", new { minutes = lateMinutes })
            : text.Of("attendance.checkIn.onTime");
        var timeText    = text.Of("attendance.value.time", new { time = time.ToString("HH:mm") });

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = headerColor,
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.checkIn.done"), color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = timeText, color = "#ffffffcc", size = "sm" }
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
                            new { type = "text", text = text.Of("attendance.field.location"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = locationName, size = "sm", flex = 3, align = "end", wrap = true }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("attendance.field.checkInTime"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = timeText, size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }

    public static object BuildCheckOutResultCard(
        MessageText text, string name, DateTime checkInTime, DateTime checkOutTime, string locationName)
    {
        var worked = checkOutTime - checkInTime;
        var workedText   = text.Of("attendance.checkOut.worked",
            new { hours = (int)worked.TotalHours, minutes = worked.Minutes });
        var checkInText  = text.Of("attendance.value.time", new { time = checkInTime.ToString("HH:mm") });
        var checkOutText = text.Of("attendance.value.time", new { time = checkOutTime.ToString("HH:mm") });

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = "#0C7BB3",
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.checkOut.done"), color = "#ffffff", size = "md", weight = "bold" },
                    new { type = "text", text = checkOutText, color = "#ffffffcc", size = "sm" }
                }
            },
            body = new
            {
                type = "box", layout = "vertical", spacing = "sm",
                contents = new object[]
                {
                    new { type = "text", text = name, weight = "bold", size = "lg" },
                    new { type = "text", text = workedText, color = "#0C7BB3", size = "sm" },
                    new { type = "separator", margin = "md" },
                    new
                    {
                        type = "box", layout = "horizontal", margin = "md",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("attendance.field.location"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = locationName, size = "sm", flex = 3, align = "end", wrap = true }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("attendance.field.checkIn"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkInText, size = "sm", flex = 3, align = "end" }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("attendance.field.checkOut"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkOutText, size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }

    public static object BuildAttendanceTodayCard(
        MessageText text, string name, string date, string? checkIn, string? checkOut, string status)
    {
        var statusColor = status switch
        {
            "Present" => "#1DB446",
            "Late"    => "#FF8C00",
            "Absent"  => "#E74C3C",
            _         => "#AAAAAA"
        };
        // ป้ายสถานะเป็นคีย์ตามชื่อค่า enum — ค่าใหม่ที่ยังไม่มีคำแปลจะโผล่ชื่อคีย์ให้เห็นแทนที่จะเงียบ
        var statusLabel = text.Of(status switch
        {
            "Present" => "attendance.status.present",
            "Late"    => "attendance.status.late",
            "Absent"  => "attendance.status.absent",
            _         => "attendance.status.notRecorded"
        });
        var checkInText  = checkIn is not null ? text.Of("attendance.value.time", new { time = checkIn }) : "—";
        var checkOutText = checkOut is not null ? text.Of("attendance.value.time", new { time = checkOut }) : "—";

        return new
        {
            type = "bubble",
            header = new
            {
                type = "box", layout = "vertical", backgroundColor = "#0C7BB3",
                paddingAll = "16px",
                contents = new object[]
                {
                    new { type = "text", text = text.Of("attendance.today.title"), color = "#ffffff", size = "md", weight = "bold" },
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
                            new { type = "text", text = text.Of("attendance.field.checkIn"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkInText, size = "sm", flex = 3, align = "end" }
                        }
                    },
                    new
                    {
                        type = "box", layout = "horizontal",
                        contents = new object[]
                        {
                            new { type = "text", text = text.Of("attendance.field.checkOut"), size = "sm", color = "#555555", flex = 2 },
                            new { type = "text", text = checkOutText, size = "sm", flex = 3, align = "end" }
                        }
                    }
                }
            }
        };
    }
}
