using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExternalTicketSubject : BaseEntity
{
    public Guid ExternalTicketTopicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    // Template ข้อความตั้งต้น + suggestion (JSON array ของ string) ให้ฟอร์ม LIFF เติมอัตโนมัติ — แบบเบา ไม่แยก config entity เหมือนภายใน
    public string? Template { get; set; }
    public string SuggestionsJson { get; set; } = "[]";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ExternalTicketTopic Topic { get; set; } = null!;
}
