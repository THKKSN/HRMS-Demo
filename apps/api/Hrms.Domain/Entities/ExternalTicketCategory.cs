using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExternalTicketCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ExternalTicketTopic> Topics { get; set; } = new List<ExternalTicketTopic>();
}
