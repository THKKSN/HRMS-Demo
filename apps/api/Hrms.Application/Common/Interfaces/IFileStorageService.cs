namespace Hrms.Application.Common.Interfaces;

public record FileUploadResult(
    string Key,
    string Url,
    string FileName,
    string ContentType,
    long SizeBytes);

public interface IFileStorageService
{
    /// <summary>อัปโหลดไฟล์ — คืน key (relative path) และ URL สำหรับเข้าถึง</summary>
    Task<FileUploadResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string module,
        CancellationToken ct = default);

    /// <summary>คืน URL สำหรับเข้าถึงไฟล์จาก key</summary>
    string GetUrl(string key);

    /// <summary>ลบไฟล์ตาม key (ไม่ throw ถ้าไม่มีไฟล์)</summary>
    Task DeleteAsync(string key, CancellationToken ct = default);

    Task<FileUploadResult> UploadProtectedTicketAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct = default);

    Task<Stream> OpenTicketReadAsync(string key, CancellationToken ct = default);

    Task DeleteTicketAsync(string key, CancellationToken ct = default);
}
