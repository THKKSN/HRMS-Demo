using Hrms.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Hrms.Infrastructure.Services;

public class LocalFileStorageService(
    IWebHostEnvironment env,
    IConfiguration config,
    IHttpContextAccessor httpContextAccessor) : IFileStorageService
{
    private static readonly HashSet<string> AllowedExtensions =
        [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    public async Task<FileUploadResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string module,
        CancellationToken ct = default)
    {
        if (stream.Length > MaxFileSizeBytes)
            throw new InvalidOperationException($"ไฟล์ต้องมีขนาดไม่เกิน 10 MB (ได้รับ {stream.Length / 1024 / 1024} MB)");

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new InvalidOperationException($"ไม่รองรับไฟล์ประเภท {ext} — รองรับเฉพาะ {string.Join(", ", AllowedExtensions)}");

        var now  = DateTime.UtcNow.AddHours(7);
        var guid = Guid.NewGuid().ToString("N")[..12];
        var safeModule = Path.GetFileName(module.Trim('/'));

        // key = relative path ใต้ uploads/
        var key      = $"{safeModule}/{now:yyyy}/{now:MM}/{guid}{ext}";
        var fullPath = Path.Combine(env.WebRootPath, "uploads", key.Replace('/', Path.DirectorySeparatorChar));

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var dest = File.Create(fullPath);
        stream.Position = 0;
        await stream.CopyToAsync(dest, ct);

        return new FileUploadResult(
            Key:         key,
            Url:         GetUrl(key),
            FileName:    fileName,
            ContentType: contentType,
            SizeBytes:   stream.Length);
    }

    public string GetUrl(string key)
    {
        var request = httpContextAccessor.HttpContext?.Request;
        var baseUrl = request?.Host.HasValue == true
            ? $"{request.Scheme}://{request.Host.Value}"
            : config["App:BaseUrl"]?.TrimEnd('/') ?? string.Empty;
        return $"{baseUrl}/uploads/{key}";
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(env.WebRootPath, "uploads", key.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public async Task<FileUploadResult> UploadProtectedTicketAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        if (stream.Length > MaxFileSizeBytes)
            throw new InvalidOperationException("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");

        var signature = new byte[Math.Min(12, (int)stream.Length)];
        stream.Position = 0;
        _ = await stream.ReadAsync(signature, ct);
        stream.Position = 0;

        var detected = DetectTicketFile(signature)
            ?? throw new InvalidOperationException("ชนิดไฟล์ไม่ตรงกับเนื้อหา หรือไม่รองรับ");
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!detected.Extensions.Contains(extension))
            throw new InvalidOperationException("นามสกุลไฟล์ไม่ตรงกับเนื้อหาไฟล์");

        var now = DateTime.UtcNow.AddHours(7);
        var key = $"{now:yyyy}/{now:MM}/{Guid.NewGuid():N}{detected.Extension}";
        var fullPath = ProtectedTicketPath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var destination = new FileStream(
            fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await stream.CopyToAsync(destination, ct);

        return new FileUploadResult(
            key,
            string.Empty,
            Path.GetFileName(fileName),
            detected.ContentType,
            stream.Length);
    }

    public Task<Stream> OpenTicketReadAsync(string key, CancellationToken ct = default)
    {
        var protectedPath = ProtectedTicketPath(key);
        if (File.Exists(protectedPath))
            return Task.FromResult<Stream>(new FileStream(
                protectedPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true));

        var legacyPath = SafePath(Path.Combine(env.WebRootPath, "uploads"), key);
        if (File.Exists(legacyPath))
            return Task.FromResult<Stream>(new FileStream(
                legacyPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true));

        throw new FileNotFoundException("ไม่พบไฟล์");
    }

    public Task DeleteTicketAsync(string key, CancellationToken ct = default)
    {
        var protectedPath = ProtectedTicketPath(key);
        if (File.Exists(protectedPath)) File.Delete(protectedPath);
        var legacyPath = SafePath(Path.Combine(env.WebRootPath, "uploads"), key);
        if (File.Exists(legacyPath)) File.Delete(legacyPath);
        return Task.CompletedTask;
    }

    private string ProtectedTicketPath(string key)
        => SafePath(Path.Combine(env.ContentRootPath, "App_Data", "protected", "tickets"), key);

    private static string SafePath(string root, string key)
    {
        if (string.IsNullOrWhiteSpace(key) || Path.IsPathRooted(key) || key.Contains(".."))
            throw new InvalidOperationException("Storage key ไม่ถูกต้อง");
        var normalizedRoot = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
        var fullPath = Path.GetFullPath(Path.Combine(root, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!fullPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Storage key ไม่ถูกต้อง");
        return fullPath;
    }

    private static TicketFileType? DetectTicketFile(byte[] bytes)
    {
        if (bytes.Length >= 5 && bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8))
            return new(".pdf", "application/pdf", new[] { ".pdf" });
        if (bytes.Length >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff)
            return new(".jpg", "image/jpeg", new[] { ".jpg", ".jpeg" });
        if (bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(
            new byte[] { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a }))
            return new(".png", "image/png", new[] { ".png" });
        if (bytes.Length >= 12 &&
            bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
            bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8))
            return new(".webp", "image/webp", new[] { ".webp" });
        return null;
    }

    private sealed record TicketFileType(
        string Extension,
        string ContentType,
        IReadOnlyCollection<string> Extensions);
}
