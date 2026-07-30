using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class TicketPendingUpload : BaseEntity
{
    public Guid UploadedByEmployeeId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime? LinkedAt { get; set; }
    public Guid? TicketAttachmentId { get; set; }

    public Employee UploadedByEmployee { get; set; } = null!;
}
