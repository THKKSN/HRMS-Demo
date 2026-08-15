using System.Net;
using System.Text;
using FluentAssertions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure.Services;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.EmployeeImports;

public class PiswinEmployeeClientTests
{
    [Fact]
    public async Task FindByNationalIdAsync_ShouldMapAllowedFieldsAndUsDate()
    {
        using var httpClient = CreateHttpClient("""
        {
          "columns": ["ID", "First_Name", "Last_Name", "Id_Card", "Start_Working_Date", "Active", "Salary"],
          "rows": [{
            "ID": 9905,
            "First_Name": "Test",
            "Last_Name": "User",
            "Id_Card": "1103703466623",
            "Start_Working_Date": "03/17/2025",
            "Active": true,
            "Salary": 50000
          }]
        }
        """);
        var client = new PiswinEmployeeClient(httpClient, Options.Create(new PiswinOptions()));

        var result = await client.FindByNationalIdAsync("1103703466623");

        result.Should().Be(new PiswinEmployee(
            "9905", "Test", "User", "1103703466623", new DateOnly(2025, 3, 17), true));
    }

    [Fact]
    public async Task FindByNationalIdAsync_ShouldThrowNotFound_WhenRowsAreEmpty()
    {
        using var httpClient = CreateHttpClient("""{"columns":[],"rows":[]}""");
        var client = new PiswinEmployeeClient(httpClient, Options.Create(new PiswinOptions()));

        Func<Task> action = async () => await client.FindByNationalIdAsync("1103703466623");

        await action.Should().ThrowAsync<ExternalEmployeeNotFoundException>();
    }

    [Fact]
    public async Task FindByNationalIdAsync_ShouldRejectSourceRowWithMismatchedNationalId()
    {
        using var httpClient = CreateHttpClient("""
        {
          "columns": ["ID", "First_Name", "Last_Name", "Id_Card"],
          "rows": [{"ID":9905,"First_Name":"Test","Last_Name":"User","Id_Card":"9999999999999"}]
        }
        """);
        var client = new PiswinEmployeeClient(httpClient, Options.Create(new PiswinOptions()));

        Func<Task> action = async () => await client.FindByNationalIdAsync("1103703466623");

        await action.Should().ThrowAsync<ExternalEmployeeDataException>();
    }

    [Fact]
    public async Task FindByNationalIdAsync_ShouldSendConfiguredApiKeyToPiswin()
    {
        string[] capturedApiKeyValues = [];
        using var httpClient = CreateHttpClient("""
        {
          "columns": ["ID", "First_Name", "Last_Name", "Id_Card"],
          "rows": [{"ID":9905,"First_Name":"Test","Last_Name":"User","Id_Card":"1103703466623"}]
        }
        """, request =>
        {
            capturedApiKeyValues = request.Headers.TryGetValues("X-API-Key", out var values)
                ? values.ToArray()
                : [];
        });
        var client = new PiswinEmployeeClient(
            httpClient,
            Options.Create(new PiswinOptions { ApiKey = "test-api-key" }));

        await client.FindByNationalIdAsync("1103703466623");

        capturedApiKeyValues.Should().ContainSingle("test-api-key");
    }

    [Fact]
    public async Task FindByNationalIdAsync_ShouldPreservePiswinErrorStatusForDiagnostics()
    {
        using var httpClient = CreateHttpClient(
            """{"message":"invalid api key"}""",
            statusCode: HttpStatusCode.Unauthorized);
        var client = new PiswinEmployeeClient(
            httpClient,
            Options.Create(new PiswinOptions { ApiKey = "test-api-key" }));

        var action = async () => await client.FindByNationalIdAsync("1103703466623");

        var exception = await action.Should().ThrowAsync<ExternalServiceUnavailableException>();
        exception.Which.StatusCode.Should().Be((int)HttpStatusCode.Unauthorized);
        exception.Which.ResponseBodySnippet.Should().Contain("invalid api key");
    }

    private static HttpClient CreateHttpClient(
        string json,
        Action<HttpRequestMessage>? captureRequest = null,
        HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            captureRequest?.Invoke(request);
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });
        return new HttpClient(handler) { BaseAddress = new Uri("http://piswin.test/") };
    }

    private sealed class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(responseFactory(request));
    }
}
