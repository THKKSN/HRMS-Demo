using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/uploads")]
[Authorize]
public class UploadController(
    IFileStorageService storage,
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService) : ControllerBase
{
    private static readonly HashSet<string> AllowedModules = ["leaves", "payslips", "general", "tickets", "expenses", "memos"];

    /// <summary>อัปโหลดไฟล์ — คืน key และ URL สำหรับใช้ใน form submit</summary>
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromQuery] string module = "general",
        CancellationToken ct = default)
    {
        if (currentUser.EmployeeId is null)
            return Unauthorized(new { error = "UNAUTHENTICATED" });

        if (!AllowedModules.Contains(module.ToLower()))
            return BadRequest(new { error = "INVALID_MODULE", message = $"module must be one of: {string.Join(", ", AllowedModules)}" });
        if (module.Equals("tickets", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "PROTECTED_UPLOAD_REQUIRED", message = "Use /v1/uploads/tickets instead." });
        if (module.Equals("expenses", StringComparison.OrdinalIgnoreCase) &&
            !await permService.HasPermissionAsync(currentUser, "expense:upload-attachment", ct))
            return StatusCode(403, new { error = "UPLOAD_EXPENSE_FORBIDDEN", message = "You are not allowed to upload expense attachments." });
        // แนบไฟล์ memo ได้ทุกคนที่สร้างเรื่องได้ (ผู้ทำ step ก็มี memo:create เป็น default ทุก role อยู่แล้ว)
        if (module.Equals("memos", StringComparison.OrdinalIgnoreCase) &&
            !await permService.HasPermissionAsync(currentUser, "memo:create", ct))
            return StatusCode(403, new { error = "UPLOAD_MEMO_FORBIDDEN", message = "You are not allowed to upload memo attachments." });

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "NO_FILE", message = "No file was provided." });

        // ไม่ดัก exception เอง — storage โยน BadRequestException ที่พก code เฉพาะ (ไฟล์ใหญ่เกิน/ชนิดไม่รองรับ)
        // แล้ว GlobalExceptionMiddleware ตอบให้ ของเดิมยุบเป็น UPLOAD_REJECTED ก้อนเดียวแล้วส่งข้อความไทยไปแทน
        await using var stream = file.OpenReadStream();
        var result = await storage.UploadAsync(
            stream,
            file.FileName,
            file.ContentType,
            module,
            ct);

        return Ok(new
        {
            key         = result.Key,
            url         = result.Url,
            fileName    = result.FileName,
            contentType = result.ContentType,
            sizeBytes   = result.SizeBytes,
        });
    }

    /// <summary>ลบไฟล์ตาม key (HR/Admin เท่านั้น)</summary>
    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string key, CancellationToken ct)
    {
        if (currentUser.EmployeeId is null)
            return Unauthorized(new { error = "UNAUTHENTICATED" });

        var canDelete = await permService.HasPermissionAsync(currentUser, "leave:approve-hr", ct);
        if (!canDelete)
            return StatusCode(403, new { error = "UPLOAD_DELETE_FORBIDDEN", message = "Only HR can delete files." });

        if (string.IsNullOrWhiteSpace(key))
            return BadRequest(new { error = "MISSING_KEY" });

        if (key.Contains("..") || Path.IsPathRooted(key))
            return BadRequest(new { error = "INVALID_KEY" });

        await storage.DeleteAsync(key, ct);
        return NoContent();
    }
    [HttpPost("tickets")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> UploadTicket(IFormFile file, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId;
        if (!employeeId.HasValue)
            return Unauthorized(new { error = "UNAUTHENTICATED" });
        if (!await permService.HasPermissionAsync(currentUser, "ticket:add-attachment", ct))
            return StatusCode(403, new { error = "FORBIDDEN" });
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "NO_FILE", message = "No file was provided." });

        FileUploadResult? result = null;
        try
        {
            await using var stream = file.OpenReadStream();
            result = await storage.UploadProtectedTicketAsync(
                stream, file.FileName, file.ContentType, ct);
            var upload = new TicketPendingUpload
            {
                UploadedByEmployeeId = employeeId.Value,
                StorageKey = result.Key,
                FileName = result.FileName,
                ContentType = result.ContentType,
                SizeBytes = result.SizeBytes,
                CreatedBy = employeeId,
                UpdatedBy = employeeId
            };
            db.TicketPendingUploads.Add(upload);
            await db.SaveChangesAsync(ct);
            return Ok(new
            {
                uploadId = upload.Id,
                url = $"ticket-upload:{upload.Id}",
                fileName = upload.FileName,
                contentType = upload.ContentType,
                sizeBytes = upload.SizeBytes
            });
        }
        catch
        {
            if (result is not null) await storage.DeleteTicketAsync(result.Key, ct);
            throw;
        }
    }
}
