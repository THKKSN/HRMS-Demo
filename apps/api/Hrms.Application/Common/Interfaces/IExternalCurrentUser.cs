namespace Hrms.Application.Common.Interfaces;

public interface IExternalCurrentUser
{
    Guid? ExternalReporterId { get; }
    string? LineUserId { get; }
    bool IsAuthenticated { get; }
}
