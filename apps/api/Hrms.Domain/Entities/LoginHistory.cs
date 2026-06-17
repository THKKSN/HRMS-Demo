namespace Hrms.Domain.Entities;

public class LoginHistory
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid EmployeeId { get; init; }
    public string LoginMethod { get; init; } = string.Empty; // "Line" | "Password"
    public string? IpAddress { get; init; }
    public string? UserAgent { get; init; }
    public DateTime LoginAt { get; init; } = DateTime.UtcNow;

    public Employee Employee { get; init; } = null!;
}
