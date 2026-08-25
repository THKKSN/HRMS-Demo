using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExternalTicketTopic : BaseEntity
{
    public Guid ExternalTicketCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ExternalTicketCategory Category { get; set; } = null!;
    public ICollection<ExternalTicketSubject> Subjects { get; set; } = new List<ExternalTicketSubject>();
}
