using System.Text;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public sealed class ExternalRepairSyncClient(HttpClient httpClient, IOptions<ExternalRepairSyncOptions> options)
    : IExternalRepairSyncClient
{
    private const string ApiKeyHeaderName = "X-API-Key";

    public async Task SendAsync(string payloadJson, CancellationToken ct = default)
    {
        var configuration = options.Value;
        if (!configuration.Enabled || string.IsNullOrWhiteSpace(configuration.Endpoint))
            throw new InvalidOperationException("External repair sync ยังไม่ได้เปิดใช้งานหรือไม่ได้ตั้งค่า Endpoint");

        using var request = new HttpRequestMessage(HttpMethod.Post, configuration.Endpoint)
        {
            Content = new StringContent(payloadJson, Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrWhiteSpace(configuration.ApiKey))
            request.Headers.Add(ApiKeyHeaderName, configuration.ApiKey);

        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }
}
