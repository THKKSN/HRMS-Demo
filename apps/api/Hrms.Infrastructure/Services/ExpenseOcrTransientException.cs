namespace Hrms.Infrastructure.Services;

public class ExpenseOcrTransientException(string code, string message, Exception? innerException = null)
    : Exception(message, innerException)
{
    public string Code { get; } = code;
}
