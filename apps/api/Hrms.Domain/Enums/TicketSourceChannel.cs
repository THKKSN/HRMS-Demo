namespace Hrms.Domain.Enums;

/// <summary>ช่องทางที่ผู้ใช้เปิดใบแจ้งเรื่องเข้ามา ใช้สำหรับ data analysis / dashboard</summary>
public enum TicketSourceChannel
{
    Unknown,
    LineLiff,
    WebPortal,
    ExternalPortal
}
