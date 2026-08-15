using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services;

public sealed class PiswinEmployeeClient(HttpClient httpClient, IOptions<PiswinOptions> options)
    : IPiswinEmployeeClient
{
    private const string ApiKeyHeaderName = "X-API-Key";
    private static readonly Regex NationalIdPattern = new("^[0-9]{13}$", RegexOptions.Compiled);

    public async Task<PiswinEmployee> FindByNationalIdAsync(string nationalId, CancellationToken ct = default)
    {
        if (!NationalIdPattern.IsMatch(nationalId))
            throw new ExternalEmployeeDataException("หมายเลขบัตรประชาชนไม่ถูกต้อง");

        var configuration = options.Value;
        var payload = new
        {
            strSQL = $"select * from employee where Id_Card = '{nationalId}'",
            deptCode = configuration.DepartmentCode,
            strYear = configuration.Year
        };

        HttpResponseMessage response;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, configuration.Endpoint)
            {
                Content = JsonContent.Create(payload)
            };

            if (!string.IsNullOrWhiteSpace(configuration.ApiKey))
                request.Headers.Add(ApiKeyHeaderName, configuration.ApiKey);

            response = await httpClient.SendAsync(request, ct);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new ExternalServiceTimeoutException();
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceUnavailableException(innerException: ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await ReadResponseSnippetAsync(response, ct);
                throw new ExternalServiceUnavailableException((int)response.StatusCode, responseBody);
            }

            try
            {
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                return ParseEmployee(document.RootElement, nationalId);
            }
            catch (JsonException)
            {
                throw new ExternalEmployeeDataException("ข้อมูลจากระบบต้นทางไม่ถูกต้อง");
            }
        }
    }

    private static async Task<string?> ReadResponseSnippetAsync(HttpResponseMessage response, CancellationToken ct)
    {
        var text = await response.Content.ReadAsStringAsync(ct);
        if (string.IsNullOrWhiteSpace(text))
            return null;

        const int maxLength = 500;
        text = text.Trim();
        return text.Length <= maxLength ? text : text[..maxLength];
    }

    private static PiswinEmployee ParseEmployee(JsonElement root, string nationalId)
    {
        if (!root.TryGetProperty("columns", out var columns) || columns.ValueKind != JsonValueKind.Array ||
            !root.TryGetProperty("rows", out var rows) || rows.ValueKind != JsonValueKind.Array)
            throw new ExternalEmployeeDataException("ข้อมูลจากระบบต้นทางไม่ถูกต้อง");

        if (rows.GetArrayLength() == 0)
            throw new ExternalEmployeeNotFoundException();

        if (rows.GetArrayLength() != 1 || rows[0].ValueKind != JsonValueKind.Object)
            throw new ExternalEmployeeDataException("ข้อมูลพนักงานจากระบบต้นทางไม่ชัดเจน");

        var row = rows[0];
        var employeeCode = ReadRequiredString(row, "ID");
        var firstName = ReadRequiredString(row, "First_Name");
        var lastName = ReadRequiredString(row, "Last_Name");
        var sourceNationalId = ReadRequiredString(row, "Id_Card");
        if (!string.Equals(sourceNationalId, nationalId, StringComparison.Ordinal))
            throw new ExternalEmployeeDataException("ข้อมูลบัตรประชาชนจากระบบต้นทางไม่ตรงกัน");

        return new PiswinEmployee(
            employeeCode,
            firstName,
            lastName,
            sourceNationalId,
            ReadOptionalDate(row, "Start_Working_Date"),
            ReadOptionalBoolean(row, "Active") ?? true);
    }

    private static string ReadRequiredString(JsonElement row, string propertyName)
    {
        if (!row.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            throw new ExternalEmployeeDataException($"ไม่พบข้อมูล {propertyName} จากระบบต้นทาง");

        var text = value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
        if (string.IsNullOrWhiteSpace(text))
            throw new ExternalEmployeeDataException($"ไม่พบข้อมูล {propertyName} จากระบบต้นทาง");

        return text.Trim();
    }

    private static DateOnly? ReadOptionalDate(JsonElement row, string propertyName)
    {
        if (!row.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return null;

        var text = value.GetString()?.Trim();
        if (string.IsNullOrEmpty(text))
            return null;

        if (DateOnly.TryParseExact(text, "MM/dd/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var usDate) ||
            DateOnly.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out usDate))
            return usDate;

        throw new ExternalEmployeeDataException("วันเริ่มงานจากระบบต้นทางไม่ถูกต้อง");
    }

    private static bool? ReadOptionalBoolean(JsonElement row, string propertyName)
    {
        if (!row.TryGetProperty(propertyName, out var value) || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return null;

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
            _ => throw new ExternalEmployeeDataException("สถานะพนักงานจากระบบต้นทางไม่ถูกต้อง")
        };
    }
}
