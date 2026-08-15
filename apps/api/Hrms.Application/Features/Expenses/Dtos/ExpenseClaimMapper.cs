using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;

namespace Hrms.Application.Features.Expenses.Dtos;

internal static class ExpenseClaimMapper
{
    internal static ExpenseClaimDto ToDto(ExpenseClaim claim) =>
        new(
            claim.Id,
            claim.EmployeeId,
            $"{claim.Employee.FirstName} {claim.Employee.LastName}".Trim(),
            claim.Type,
            claim.Status,
            claim.ExpenseDate,
            claim.Amount,
            claim.MerchantName,
            claim.BillNo,
            claim.ReceiptTid,
            claim.ReceiptBatch,
            claim.ReceiptMid,
            claim.ReceiptTrace,
            claim.DriverName,
            claim.VehicleNo,
            claim.PlateNo,
            claim.FuelLiters,
            claim.TransportNo,
            claim.Origin,
            claim.CustomerName,
            claim.TripCount,
            claim.Note,
            ParseUrls(claim.AttachmentUrlsJson),
            ParseFiles(claim.AttachmentUrlsJson),
            claim.CreatedAt);

    internal static string SerializeUrls(IReadOnlyList<string> urls) =>
        JsonSerializer.Serialize(urls);

    internal static string SerializeFiles(IReadOnlyList<ExpenseAttachmentFileDto> files) =>
        JsonSerializer.Serialize(files, JsonOptions());

    internal static IReadOnlyList<string> ParseUrls(string? json)
        => ParseFiles(json).Select(file => file.Url).ToList();

    internal static IReadOnlyList<ExpenseAttachmentFileDto> ParseFiles(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var files = JsonSerializer.Deserialize<List<ExpenseAttachmentFileDto>>(json, JsonOptions());
            if (files is { Count: > 0 })
                return files.Where(file => !string.IsNullOrWhiteSpace(file.Url)).Select(NormalizeFile).ToList();
        }
        catch
        {
            // Older rows may store a plain URL or a JSON string array.
        }

        try
        {
            var urls = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            return FromUrls(urls);
        }
        catch
        {
            return FromUrls([json]);
        }
    }

    internal static IReadOnlyList<ExpenseAttachmentFileDto> NormalizeFiles(
        IReadOnlyList<ExpenseAttachmentFileDto>? files,
        IReadOnlyList<string>? urls)
    {
        if (files is { Count: > 0 })
            return files.Where(file => !string.IsNullOrWhiteSpace(file.Url)).Select(NormalizeFile).ToList();

        return FromUrls(urls ?? []);
    }

    internal static IReadOnlyList<ExpenseAttachmentFileDto> ApplySubmittedFuelFileNames(
        ExpenseClaimType type,
        string? billNo,
        bool saveAsDraft,
        IReadOnlyList<ExpenseAttachmentFileDto> files)
    {
        if (saveAsDraft || type != ExpenseClaimType.Fuel)
            return files;

        var safeBillNo = SafeFileNamePart(billNo) ?? "NoBill";
        var counters = new Dictionary<ExpenseAttachmentDocumentType, int>();
        return files.Select(file =>
        {
            var prefix = file.DocumentType switch
            {
                ExpenseAttachmentDocumentType.PaymentOrder => "Pre-Oil",
                ExpenseAttachmentDocumentType.Receipt => "Rep-Oil",
                _ => null
            };
            if (prefix is null)
                return file;

            counters[file.DocumentType] = counters.GetValueOrDefault(file.DocumentType) + 1;
            var sequence = counters[file.DocumentType] > 1 ? $"-{counters[file.DocumentType]}" : "";
            var extension = FileExtension(file.FileName) ?? FileExtension(file.Url) ?? ExtensionFromContentType(file.ContentType);
            var fileName = $"{prefix}-{safeBillNo}{sequence}{extension}";
            return file with { FileName = fileName.Length <= 255 ? fileName : fileName[..255] };
        }).ToList();
    }

    private static IReadOnlyList<ExpenseAttachmentFileDto> FromUrls(IReadOnlyList<string> urls) =>
        urls
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => new ExpenseAttachmentFileDto(url.Trim(), ExpenseAttachmentDocumentType.Other, null, null, null))
            .ToList();

    private static ExpenseAttachmentFileDto NormalizeFile(ExpenseAttachmentFileDto file) =>
        new(
            file.Url.Trim(),
            Enum.IsDefined(file.DocumentType) ? file.DocumentType : ExpenseAttachmentDocumentType.Other,
            TrimToNull(file.FileName),
            TrimToNull(file.ContentType),
            file.SizeBytes);

    private static string? TrimToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string? SafeFileNamePart(string? value)
    {
        var trimmed = TrimToNull(value);
        if (trimmed is null) return null;

        var safe = Regex.Replace(trimmed, @"[^\p{L}\p{N}._-]+", "-").Trim('.', '-', '_');
        return string.IsNullOrWhiteSpace(safe) ? null : safe;
    }

    private static string? FileExtension(string? value)
    {
        var trimmed = TrimToNull(value);
        if (trimmed is null) return null;

        var withoutQuery = trimmed.Split('?', '#')[0];
        var extension = Path.GetExtension(withoutQuery);
        return string.IsNullOrWhiteSpace(extension) || extension.Length > 10 ? null : extension.ToLowerInvariant();
    }

    private static string ExtensionFromContentType(string? contentType) =>
        contentType?.Trim().ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/jpg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "application/pdf" => ".pdf",
            _ => ".jpg"
        };

    private static JsonSerializerOptions JsonOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
