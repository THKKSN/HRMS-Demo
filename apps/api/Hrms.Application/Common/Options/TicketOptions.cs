namespace Hrms.Application.Common.Options;

/// <summary>
/// ค่าปรับแต่งพฤติกรรมระบบแจ้งเรื่อง (section "Ticket" ใน appsettings)
/// ทุกค่ามี default ในโค้ด — production ที่ยังไม่มี section นี้ใน appsettings จะใช้ค่า default ทันที
/// </summary>
public sealed class TicketOptions
{
    public const string SectionName = "Ticket";

    /// <summary>จำนวนการ์ดกิจกรรมที่ปักหมุดได้สูงสุดต่อใบแจ้งเรื่อง (ค่าต่ำกว่า 1 จะถูกปัดเป็น 1)</summary>
    public int MaxPinnedProgressEntries { get; set; } = 3;

    /// <summary>จำนวนผู้ร่วมงานสูงสุดต่อใบแจ้งเรื่อง ไม่นับผู้รับผิดชอบหลัก (ค่าต่ำกว่า 1 จะถูกปัดเป็น 1)</summary>
    public int MaxTeamMembers { get; set; } = 8;

    /// <summary>
    /// จำนวนวันรอผู้แจ้งกดปิดงาน ก่อนระบบปิดให้เอง ใช้เมื่อใบนั้นไม่มีค่าจาก workflow
    /// (ค่าต่ำกว่า 1 จะถูกปัดเป็น 1)
    ///
    /// จำเป็นเพราะ Ticket.WorkflowAutoAcknowledgeAfterDays ถ่าย snapshot จาก workflow
    /// ตอน "สร้างใบ" เท่านั้น ใบที่ตอนนั้นยังไม่มี workflow ผูกไว้จะได้ค่า null และ
    /// ค้างสถานะรอผู้แจ้งปิดงานตลอดไป ค่านี้เป็นเพดานเวลาให้ทุกใบมีทางปิดเสมอ
    /// </summary>
    public int AutoAcknowledgeAfterDaysDefault { get; set; } = 7;

    /// <summary>
    /// event ที่ส่ง notification ถึงผู้ร่วมงานด้วย — event อื่นส่งเฉพาะผู้รับผิดชอบหลัก
    /// เพื่อคุมจำนวนข้อความ LINE ไม่ให้บานตามขนาดทีม (ตั้งค่าได้จาก appsettings)
    /// </summary>
    public string[] TeamNotificationEvents { get; set; } =
    [
        "TicketTeamMemberAdded",
        "TicketTeamMemberRemoved",
        "TicketStarted",
        "TicketReturned",
        "TicketClosed",
        "TicketReassigned",
        "TicketRequesterConfirmed"
    ];
}
