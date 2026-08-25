using Hrms.Domain.Common;
using Hrms.Domain.Constants;

namespace Hrms.Domain.Entities;

public class ExternalTicketConfiguration : BaseEntity
{
    public Guid TargetCompanyId { get; set; } = ExternalTicketConstants.TargetCompanyId;
    public bool IsEnabled { get; set; }
    public bool RequireOaFriendship { get; set; }
    public string? PrivacyNoticeVersion { get; set; }
    public string? PrivacyNoticeUrl { get; set; }

    public Company TargetCompany { get; set; } = null!;
}
