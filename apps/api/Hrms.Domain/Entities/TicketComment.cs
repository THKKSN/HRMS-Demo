using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketComment : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid EmployeeId { get; set; }
    public TicketCommentType CommentType { get; set; } = TicketCommentType.General;
    public string Message { get; set; } = string.Empty;
    public bool IsInternal { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
