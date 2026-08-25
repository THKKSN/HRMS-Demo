namespace Hrms.Application.Common.Interfaces;

public interface IExternalRepairSyncClient
{
    Task SendAsync(string payloadJson, CancellationToken ct = default);
}
