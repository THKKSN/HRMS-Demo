using Hrms.Application.Common.Interfaces;

namespace Hrms.Application.Tests.Support;

internal sealed class TestMemoNumberGenerator : IMemoNumberGenerator
{
    private int _counter;

    public Task<string> NextAsync(DateOnly date, CancellationToken ct = default)
        => Task.FromResult($"Memo-{date:yyyyMMdd}-{Interlocked.Increment(ref _counter):0000}");
}
