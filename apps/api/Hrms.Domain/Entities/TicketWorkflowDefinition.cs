using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class TicketWorkflowDefinition : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public int? AutoAcknowledgeAfterDays { get; set; }
    public string BoardStepsJson { get; set; } = "[]";
    public string InProgressPresetsJson { get; set; } = "[]";
    public string ActionsJson { get; set; } = "[]";
    public string StepsJson { get; set; } = "[]";
    public string StatusStepMapJson { get; set; } = "{}";

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public ICollection<TicketSubjectGuidanceConfig> SubjectGuidanceConfigs { get; set; } = new List<TicketSubjectGuidanceConfig>();
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
