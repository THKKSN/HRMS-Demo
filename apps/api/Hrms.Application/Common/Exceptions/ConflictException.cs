namespace Hrms.Application.Common.Exceptions;

public class ConflictException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
