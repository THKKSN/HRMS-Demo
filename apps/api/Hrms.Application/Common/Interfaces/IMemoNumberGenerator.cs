namespace Hrms.Application.Common.Interfaces;

public interface IMemoNumberGenerator
{
    Task<string> NextAsync(DateOnly date, CancellationToken ct = default);
}
