namespace Hrms.Application.Common.Exceptions;

public class AccountNotLinkedException(string lineUserId) : Exception("LINE account is not linked to any employee.")
{
    public string LineUserId { get; } = lineUserId;
}
