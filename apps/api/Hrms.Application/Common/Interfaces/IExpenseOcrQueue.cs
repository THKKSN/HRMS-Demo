namespace Hrms.Application.Common.Interfaces;

public interface IExpenseOcrQueue
{
    string Enqueue(Guid expenseOcrResultId);
    string Schedule(Guid expenseOcrResultId, TimeSpan delay);
}
