using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure.Jobs;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public class HangfireExpenseOcrQueue(
    IBackgroundJobClient jobClient,
    IOptions<ExpenseOcrOptions> options) : IExpenseOcrQueue
{
    public string Enqueue(Guid expenseOcrResultId) =>
        jobClient.Create(
            Job.FromExpression<ExpenseOcrJob>(
                job => job.ProcessAsync(expenseOcrResultId, CancellationToken.None)),
            new EnqueuedState(NormalizeQueueName(options.Value.QueueName)));

    public string Schedule(Guid expenseOcrResultId, TimeSpan delay) =>
        jobClient.Schedule<ExpenseOcrJob>(
            job => job.ProcessAsync(expenseOcrResultId, CancellationToken.None),
            delay);

    private static string NormalizeQueueName(string? value) =>
        string.IsNullOrWhiteSpace(value) ? ExpenseOcrOptions.DefaultQueueName : value.Trim().ToLowerInvariant();
}
