using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExternalReporter : BaseEntity
{
    public string LineUserId { get; set; } = string.Empty;
    public string LineDisplayName { get; set; } = string.Empty;
    public string? PictureUrl { get; set; }
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Organization { get; set; }
    public string? PrivacyNoticeVersion { get; set; }
    public DateTime? ConsentedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}
