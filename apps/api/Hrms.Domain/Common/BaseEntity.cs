namespace Hrms.Domain.Common;

public abstract class BaseEntity
{
    // Thailand does not observe DST — UTC+7 is always correct
    private static DateTime ThaiNow => DateTime.UtcNow.AddHours(7);

    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = ThaiNow;
    public DateTime UpdatedAt { get; set; } = ThaiNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
}
