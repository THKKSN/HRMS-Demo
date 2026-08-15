using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class TicketSubjectGuidanceConfig : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? TopicId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SuggestionTargetLabel { get; set; }
    public string SuggestionsJson { get; set; } = "[]";
    public string Template { get; set; } = string.Empty;
    public Guid? WorkflowDefinitionId { get; set; }
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public TicketCategory? Category { get; set; }
    public TicketTopic? Topic { get; set; }
    public TicketSubject? Subject { get; set; }
    public TicketWorkflowDefinition? WorkflowDefinition { get; set; }
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
