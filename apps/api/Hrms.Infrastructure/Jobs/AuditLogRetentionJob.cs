using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Hangfire;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Jobs;

/// <summary>
/// เก็บรักษา audit log แบบเดือนปฏิทิน: cutoff = วันที่ 1 ของเดือนปัจจุบัน ลบด้วย RetentionMonths เดือน
/// ทุกเดือนที่อยู่ก่อน cutoff จะถูก archive เป็น audit-logs-yyyy-MM.jsonl.gz ก่อน แล้วค่อยลบออกจาก DB ทีละทั้งเดือน
/// การลบจริงจึงเกิดเฉพาะตอนขึ้นเดือนใหม่ แม้ job จะถูกเรียกทุกวันก็ตาม
/// </summary>
[AutomaticRetry(Attempts = 0)]
public class AuditLogRetentionJob(
    HrmsDbContext db,
    IOptions<AuditLogRetentionOptions> options,
    ILogger<AuditLogRetentionJob> logger)
{
    public const string PurgeModule = "system";
    public const string PurgeEntityType = "AuditLog";
    public const string PurgeAction = "Purge";

    private static readonly JsonSerializerOptions ArchiveJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        // ให้ภาษาไทยในไฟล์อ่านออกตรงๆ ไม่ถูก escape เป็น \uXXXX
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        WriteIndented = false,
    };

    public sealed record ArchiveResult(string FileName, int Rows, long Bytes, string Sha256);

    public Task RunAsync(CancellationToken ct = default)
        => PurgeAsync(DateTime.UtcNow.AddHours(7), ct);

    /// <summary>วันที่ 1 ของเดือนแรกที่ยังเก็บไว้ — แถวที่ CreatedAt น้อยกว่าค่านี้จะถูกลบ</summary>
    public static DateTime GetCutoff(DateTime asOfThai, int retentionMonths)
        => new DateTime(asOfThai.Year, asOfThai.Month, 1, 0, 0, 0, DateTimeKind.Unspecified)
            .AddMonths(-retentionMonths);

    /// <summary>ชื่อไฟล์ archive ของเดือนนั้น (ไม่รวม suffix ลำดับ)</summary>
    public static string ArchiveFileName(DateTime monthStart) => $"audit-logs-{monthStart:yyyy-MM}.jsonl.gz";

    public static string ResolveArchivePath(string? configured)
    {
        if (string.IsNullOrWhiteSpace(configured))
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "TBG Assistant", "AuditLogArchive");

        // path แบบ relative ให้ยึดโฟลเดอร์แอป ไม่ใช่ current directory ซึ่งบน IIS มักเป็น system32
        return Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(AppContext.BaseDirectory, configured);
    }

    public async Task<int> PurgeAsync(DateTime asOfThai, CancellationToken ct = default)
    {
        var opts = options.Value;
        if (!opts.Enabled)
        {
            logger.LogDebug("Audit log retention is disabled; skipping purge");
            return 0;
        }

        if (opts.RetentionMonths < 1)
        {
            // กันการตั้งค่าเป็น 0 หรือติดลบแล้วลบข้อมูลเดือนปัจจุบันทิ้งโดยไม่ตั้งใจ
            logger.LogWarning(
                "Audit log retention skipped: RetentionMonths must be at least 1 (configured {RetentionMonths})",
                opts.RetentionMonths);
            return 0;
        }

        var cutoff = GetCutoff(asOfThai, opts.RetentionMonths);
        var oldest = await db.AuditLogs
            .Where(log => log.CreatedAt < cutoff)
            .OrderBy(log => log.CreatedAt)
            .Select(log => (DateTime?)log.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (oldest is null)
        {
            logger.LogInformation(
                "Audit log retention: nothing to purge before {Cutoff:yyyy-MM-dd} (keeping {RetentionMonths} full month(s) + current month)",
                cutoff, opts.RetentionMonths);
            return 0;
        }

        // ถ้าสร้างโฟลเดอร์ archive ไม่ได้ ให้ job ล้มตรงนี้ก่อนลบอะไรทั้งสิ้น
        string? archiveDir = null;
        if (opts.ArchiveEnabled)
        {
            archiveDir = ResolveArchivePath(opts.ArchivePath);
            Directory.CreateDirectory(archiveDir);
        }

        var batchSize = Math.Clamp(opts.BatchSize, 1, 5000);
        var maxMonths = Math.Max(1, opts.MaxMonthsPerRun);
        var totalDeleted = 0;
        var processedMonths = 0;
        var monthStart = new DateTime(oldest.Value.Year, oldest.Value.Month, 1);

        for (; monthStart < cutoff; monthStart = monthStart.AddMonths(1))
        {
            if (processedMonths >= maxMonths)
            {
                logger.LogWarning(
                    "Audit log retention reached MaxMonthsPerRun ({MaxMonths}); months from {Month:yyyy-MM} will be handled on the next run",
                    maxMonths, monthStart);
                break;
            }

            var monthEnd = monthStart.AddMonths(1);
            var expected = await db.AuditLogs
                .CountAsync(log => log.CreatedAt >= monthStart && log.CreatedAt < monthEnd, ct);
            if (expected == 0) continue;

            ArchiveResult? archive = null;
            if (archiveDir is not null)
            {
                archive = await ArchiveMonthAsync(archiveDir, monthStart, monthEnd, ct);
                if (archive.Rows != expected)
                {
                    // ไฟล์ไม่ครบ = ไม่ลบ ปล่อยไฟล์ไว้ให้ตรวจสอบ แล้วรอบหน้าจะลองใหม่เป็นไฟล์ลำดับถัดไป
                    logger.LogError(
                        "Audit log archive for {Month:yyyy-MM} wrote {Rows} row(s) but database has {Expected}; skipping delete",
                        monthStart, archive.Rows, expected);
                    processedMonths++;
                    continue;
                }
            }

            var deleted = await DeleteMonthAsync(monthStart, monthEnd, batchSize, ct);
            totalDeleted += deleted;
            processedMonths++;

            await RecordPurgeAsync(monthStart, deleted, archive, opts.RetentionMonths, ct);
            logger.LogInformation(
                "Audit log retention purged {Deleted} row(s) for {Month:yyyy-MM}; archive={Archive}",
                deleted, monthStart, archive?.FileName ?? "(disabled)");
        }

        return totalDeleted;
    }

    private async Task<ArchiveResult> ArchiveMonthAsync(
        string archiveDir, DateTime monthStart, DateTime monthEnd, CancellationToken ct)
    {
        var finalPath = NextAvailablePath(archiveDir, monthStart);
        var tempPath = finalPath + ".tmp";
        var rows = 0;

        try
        {
            await using (var file = new FileStream(
                tempPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            await using (var gzip = new GZipStream(file, CompressionLevel.Optimal))
            await using (var writer = new StreamWriter(gzip, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false)))
            {
                // stream ทีละแถว ไม่โหลดทั้งเดือนขึ้น memory — ห้ามยิง query อื่นระหว่าง loop เพราะ MySQL ไม่รองรับ MARS
                var query = db.AuditLogs
                    .AsNoTracking()
                    .Where(log => log.CreatedAt >= monthStart && log.CreatedAt < monthEnd)
                    .OrderBy(log => log.CreatedAt)
                    .ThenBy(log => log.Id)
                    .AsAsyncEnumerable();

                await foreach (var log in query.WithCancellation(ct))
                {
                    await writer.WriteLineAsync(JsonSerializer.Serialize(ToArchiveRecord(log), ArchiveJson));
                    rows++;
                }
            }

            File.Move(tempPath, finalPath);
        }
        catch
        {
            TryDelete(tempPath);
            throw;
        }

        var bytes = new FileInfo(finalPath).Length;
        var sha256 = await ComputeSha256Async(finalPath, ct);
        return new ArchiveResult(Path.GetFileName(finalPath), rows, bytes, sha256);
    }

    private async Task<int> DeleteMonthAsync(
        DateTime monthStart, DateTime monthEnd, int batchSize, CancellationToken ct)
    {
        var deleted = 0;
        while (true)
        {
            var ids = await db.AuditLogs
                .Where(log => log.CreatedAt >= monthStart && log.CreatedAt < monthEnd)
                .OrderBy(log => log.CreatedAt)
                .Take(batchSize)
                .Select(log => log.Id)
                .ToListAsync(ct);
            if (ids.Count == 0) break;

            // ลบด้วย stub entity ตาม Id เพื่อไม่ต้องโหลด JSON OldValues/NewValues ขึ้นมาอีกรอบ
            db.AuditLogs.RemoveRange(ids.Select(id => new AuditLog { Id = id }));
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
            deleted += ids.Count;

            if (ids.Count < batchSize) break;
        }

        return deleted;
    }

    private async Task RecordPurgeAsync(
        DateTime monthStart, int deleted, ArchiveResult? archive, int retentionMonths, CancellationToken ct)
    {
        var archiveNote = archive is null
            ? "ไม่ได้สำรองไฟล์ (ArchiveEnabled=false)"
            : $"สำรองไว้ที่ {archive.FileName} ({archive.Bytes / 1024.0:N1} KB)";

        // บันทึกร่องรอยการลบไว้ใน audit log เอง เพื่อให้ผู้ดูแลเห็นจากหน้า Audit Log ว่าลบเดือนไหน เท่าไหร่ ไฟล์อยู่ที่ใด
        db.AuditLogs.Add(new AuditLog
        {
            Module = PurgeModule,
            EntityType = PurgeEntityType,
            EntityId = monthStart.ToString("yyyy-MM"),
            Action = PurgeAction,
            Description =
                $"ลบ audit log เดือน {monthStart:yyyy-MM} จำนวน {deleted:N0} รายการ {archiveNote} " +
                $"(นโยบายเก็บย้อนหลัง {retentionMonths} เดือนเต็ม + เดือนปัจจุบัน)",
            NewValues = JsonSerializer.Serialize(new
            {
                Month = monthStart.ToString("yyyy-MM"),
                Rows = deleted,
                ArchiveFile = archive?.FileName,
                ArchiveBytes = archive?.Bytes,
                ArchiveSha256 = archive?.Sha256,
                RetentionMonths = retentionMonths,
            }, ArchiveJson),
            PerformedByActorType = AuditActorType.System,
            PerformedByName = "System",
        });
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
    }

    private static object ToArchiveRecord(AuditLog log) => new
    {
        log.Id,
        log.CreatedAt,
        log.Module,
        log.EntityType,
        log.EntityId,
        log.Action,
        log.Description,
        OldValues = ParseJsonOrRaw(log.OldValues),
        NewValues = ParseJsonOrRaw(log.NewValues),
        log.PerformedByEmployeeId,
        log.PerformedByExternalReporterId,
        PerformedByActorType = log.PerformedByActorType.ToString(),
        log.PerformedByName,
        log.CreatedBy,
        log.UpdatedAt,
        log.UpdatedBy,
    };

    /// <summary>OldValues/NewValues เก็บเป็น JSON string ใน DB — ในไฟล์ให้เป็น JSON ซ้อนเพื่อให้ jq หรือเครื่องมืออื่น query ได้</summary>
    private static object? ParseJsonOrRaw(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            return doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            return raw;
        }
    }

    private static string NextAvailablePath(string archiveDir, DateTime monthStart)
    {
        // ปกติได้ audit-logs-2026-06.jsonl.gz ถ้ามีอยู่แล้ว (รอบก่อน archive สำเร็จแต่ลบไม่จบ) ให้ต่อเป็น .2 .3 ... ไม่ทับของเดิม
        var baseName = ArchiveFileName(monthStart);
        var candidate = Path.Combine(archiveDir, baseName);
        for (var seq = 2; File.Exists(candidate); seq++)
            candidate = Path.Combine(archiveDir, baseName.Replace(".jsonl.gz", $".{seq}.jsonl.gz"));
        return candidate;
    }

    private static async Task<string> ComputeSha256Async(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static void TryDelete(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); }
        catch { /* best effort */ }
    }
}
