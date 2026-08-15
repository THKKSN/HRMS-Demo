namespace Hrms.Application.Common.Exceptions;

public sealed class ExternalEmployeeNotFoundException : Exception { }

public sealed class ExternalEmployeeDataException(string message) : Exception(message) { }

public sealed class ExternalServiceUnavailableException(
    int? statusCode = null,
    string? responseBodySnippet = null,
    Exception? innerException = null)
    : Exception("External service is unavailable.", innerException)
{
    public int? StatusCode { get; } = statusCode;
    public string? ResponseBodySnippet { get; } = responseBodySnippet;
}

public sealed class ExternalServiceTimeoutException : Exception { }
