namespace Hrms.Application.Common.Interfaces;

public interface ITicketNumberGenerator
{
    Task<string> NextAsync(DateOnly date, CancellationToken ct = default);
}
