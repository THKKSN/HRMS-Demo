using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class TicketReview : BaseEntity
{
    public Guid TicketId { get; set; }
    public int ReviewRound { get; set; }
    public TicketReviewDecision Decision { get; set; }
    public string? ReviewNote { get; set; }
    public Guid ReviewedByEmployeeId { get; set; }
    public DateTime ReviewedAt { get; set; }
    public Guid? ResolvedByEmployeeId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public TicketProblemType? ProblemTypeSnapshot { get; set; }
    public string? InitialInspectionSnapshot { get; set; }
    public string? ResolutionSnapshot { get; set; }
    public string ResolvedAttachmentIdsJson { get; set; } = "[]";

    public Ticket Ticket { get; set; } = null!;
    public Employee ReviewedByEmployee { get; set; } = null!;
    public Employee? ResolvedByEmployee { get; set; }
}
