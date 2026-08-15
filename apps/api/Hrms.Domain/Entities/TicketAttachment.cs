using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketAttachment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid? TicketProgressEntryId { get; set; }
    public Guid UploadedByEmployeeId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long SizeBytes { get; set; }
    public TicketAttachmentStage Stage { get; set; } = TicketAttachmentStage.Created;
    public TicketAttachmentVisibility Visibility { get; set; } = TicketAttachmentVisibility.Public;
    public string? StorageKey { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public TicketProgressEntry? TicketProgressEntry { get; set; }
    public Employee UploadedByEmployee { get; set; } = null!;
}
