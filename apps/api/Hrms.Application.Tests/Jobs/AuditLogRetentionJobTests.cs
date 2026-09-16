using System.IO.Compression;
using System.Text.Json;
using FluentAssertions;
using Hrms.Application.Common.Options;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Hrms.Infrastructure.Jobs;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Hrms.Application.Tests.Jobs;

public sealed class AuditLogRetentionJobTests : IDisposable
{
    private readonly string _archiveDir = Path.Combine(
        Path.GetTempPath(), "hrms-audit-archive-tests", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        try { if (Directory.Exists(_archiveDir)) Directory.Delete(_archiveDir, recursive: true); }
        catch { /* best effort */ }
    }

    [Theory]
    [InlineData("2026-09-07", 3, "2026-06-01")]
    [InlineData("2026-09-30", 3, "2026-06-01")]
    [InlineData("2026-09-07", 6, "2026-03-01")]
    [InlineData("2026-01-15", 3, "2025-10-01")] // ข้ามปี
    public void GetCutoff_ShouldBeFirstDayOfMonth_RetentionMonthsBack(string asOf, int months, string expected)
    {
        var cutoff = AuditLogRetentionJob.GetCutoff(DateTime.Parse(asOf), months);

        cutoff.Should().Be(DateTime.Parse(expected));
        cutoff.Day.Should().Be(1);
        cutoff.TimeOfDay.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void ResolveArchivePath_ShouldFallBackToProgramData_AndAnchorRelativePathsToAppFolder()
    {
        var fallback = AuditLogRetentionJob.ResolveArchivePath("");
        fallback.Should().EndWith(Path.Combine("TBG Assistant", "AuditLogArchive"));
        Path.IsPathRooted(fallback).Should().BeTrue();

        var relative = AuditLogRetentionJob.ResolveArchivePath("App_Data/archive");
        relative.Should().StartWith(AppContext.BaseDirectory);

        var absolute = AuditLogRetentionJob.ResolveArchivePath(_archiveDir);
        absolute.Should().Be(_archiveDir);
    }

    [Fact]
    public async Task PurgeAsync_ShouldArchiveEachMonthThenDelete_AndKeepRowsFromCutoffOnward()
    {
        await using var db = CreateDb();
        var april = AddLog(db, new DateTime(2026, 4, 10), oldValues: """{"status":"Late"}""", description: "ทดสอบ เมษายน");
        var mayA = AddLog(db, new DateTime(2026, 5, 2));
        var mayB = AddLog(db, new DateTime(2026, 5, 31, 23, 59, 59));
        var keepJuneStart = AddLog(db, new DateTime(2026, 6, 1, 0, 0, 0));
        var keepAugust = AddLog(db, new DateTime(2026, 8, 20));
        var keepCurrent = AddLog(db, new DateTime(2026, 9, 7, 9, 0, 0));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3 });
        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7, 2, 30, 0));

        deleted.Should().Be(3);
        var remainingIds = await db.AuditLogs.Select(x => x.Id).ToListAsync();
        remainingIds.Should().NotContain(new[] { april, mayA, mayB });
        remainingIds.Should().Contain(new[] { keepJuneStart, keepAugust, keepCurrent });

        // ไฟล์เดือนละ 1 ไฟล์
        Directory.GetFiles(_archiveDir).Select(Path.GetFileName).Should().BeEquivalentTo(
            "audit-logs-2026-04.jsonl.gz", "audit-logs-2026-05.jsonl.gz");

        var aprilLines = await ReadArchiveLinesAsync("audit-logs-2026-04.jsonl.gz");
        aprilLines.Should().HaveCount(1);
        using (var doc = JsonDocument.Parse(aprilLines[0]))
        {
            var root = doc.RootElement;
            root.GetProperty("id").GetGuid().Should().Be(april);
            root.GetProperty("module").GetString().Should().Be("attendance");
            root.GetProperty("performedByActorType").GetString().Should().Be("System");
            root.GetProperty("oldValues").ValueKind.Should().Be(JsonValueKind.Object);
            root.GetProperty("oldValues").GetProperty("status").GetString().Should().Be("Late");
            root.GetProperty("newValues").ValueKind.Should().Be(JsonValueKind.Null);
        }
        aprilLines[0].Should().Contain("ทดสอบ เมษายน"); // ภาษาไทยไม่ถูก escape

        var mayLines = await ReadArchiveLinesAsync("audit-logs-2026-05.jsonl.gz");
        mayLines.Select(line => JsonDocument.Parse(line).RootElement.GetProperty("id").GetGuid())
            .Should().BeEquivalentTo(new[] { mayA, mayB });

        // แถว Purge เดือนละ 1 แถว อ้างถึงไฟล์และ checksum
        var purgeEntries = await db.AuditLogs
            .Where(x => x.Action == AuditLogRetentionJob.PurgeAction)
            .OrderBy(x => x.EntityId)
            .ToListAsync();
        purgeEntries.Select(x => x.EntityId).Should().Equal("2026-04", "2026-05");
        purgeEntries.Should().AllSatisfy(entry =>
        {
            entry.Module.Should().Be(AuditLogRetentionJob.PurgeModule);
            entry.EntityType.Should().Be(AuditLogRetentionJob.PurgeEntityType);
            entry.PerformedByActorType.Should().Be(AuditActorType.System);
            entry.PerformedByEmployeeId.Should().BeNull();
        });
        purgeEntries[1].Description.Should().Contain("จำนวน 2 รายการ").And.Contain("audit-logs-2026-05.jsonl.gz");
        using var mayMeta = JsonDocument.Parse(purgeEntries[1].NewValues!);
        mayMeta.RootElement.GetProperty("rows").GetInt32().Should().Be(2);
        mayMeta.RootElement.GetProperty("archiveFile").GetString().Should().Be("audit-logs-2026-05.jsonl.gz");
        mayMeta.RootElement.GetProperty("archiveSha256").GetString().Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [Fact]
    public async Task PurgeAsync_ShouldKeepWholeMonthUntilNextMonthStarts_NotRollingDays()
    {
        // ข้อมูล 1 มิ.ย. ต้องอยู่ครบจนถึงสิ้นเดือน ก.ย. แม้จะเกิน 90 วันไปแล้ว
        await using var db = CreateDb();
        var juneFirst = AddLog(db, new DateTime(2026, 6, 1, 8, 0, 0));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3 });

        var deletedOnSept30 = await job.PurgeAsync(new DateTime(2026, 9, 30, 23, 0, 0));
        deletedOnSept30.Should().Be(0);
        (await db.AuditLogs.AnyAsync(x => x.Id == juneFirst)).Should().BeTrue();
        Directory.Exists(_archiveDir).Should().BeFalse("ยังไม่มีอะไรต้อง archive จึงไม่ควรสร้างโฟลเดอร์");

        var deletedOnOct1 = await job.PurgeAsync(new DateTime(2026, 10, 1, 2, 30, 0));
        deletedOnOct1.Should().Be(1);
        (await db.AuditLogs.AnyAsync(x => x.Id == juneFirst)).Should().BeFalse();
        File.Exists(Path.Combine(_archiveDir, "audit-logs-2026-06.jsonl.gz")).Should().BeTrue();
    }

    [Fact]
    public async Task PurgeAsync_WhenNothingExpired_ShouldNotWritePurgeEntryOrFiles()
    {
        await using var db = CreateDb();
        AddLog(db, new DateTime(2026, 9, 1));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3 });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(0);
        (await db.AuditLogs.CountAsync()).Should().Be(1);
        (await db.AuditLogs.AnyAsync(x => x.Action == AuditLogRetentionJob.PurgeAction)).Should().BeFalse();
        Directory.Exists(_archiveDir).Should().BeFalse();
    }

    [Fact]
    public async Task PurgeAsync_WhenDisabled_ShouldNotDeleteAnything()
    {
        await using var db = CreateDb();
        AddLog(db, new DateTime(2025, 1, 1));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { Enabled = false, RetentionMonths = 3 });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(0);
        (await db.AuditLogs.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task PurgeAsync_WhenRetentionMonthsBelowOne_ShouldRefuseToDelete()
    {
        // กันการตั้งค่าเป็น 0 แล้วลบเดือนปัจจุบันทิ้ง
        await using var db = CreateDb();
        AddLog(db, new DateTime(2025, 1, 1));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 0 });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(0);
        (await db.AuditLogs.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task PurgeAsync_WhenArchiveFolderCannotBeCreated_ShouldThrowAndDeleteNothing()
    {
        // ชี้ ArchivePath ไปที่ "ไฟล์" ที่มีอยู่แล้ว ทำให้สร้างโฟลเดอร์ไม่ได้
        Directory.CreateDirectory(_archiveDir);
        var blockingFile = Path.Combine(_archiveDir, "not-a-folder");
        await File.WriteAllTextAsync(blockingFile, "x");

        await using var db = CreateDb();
        AddLog(db, new DateTime(2026, 1, 1));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3, ArchivePath = blockingFile });

        var act = () => job.PurgeAsync(new DateTime(2026, 9, 7));

        await act.Should().ThrowAsync<IOException>();
        (await db.AuditLogs.CountAsync()).Should().Be(1);
        (await db.AuditLogs.AnyAsync(x => x.Action == AuditLogRetentionJob.PurgeAction)).Should().BeFalse();
    }

    [Fact]
    public async Task PurgeAsync_WhenArchiveFileAlreadyExists_ShouldWriteNextSequenceWithoutOverwriting()
    {
        Directory.CreateDirectory(_archiveDir);
        var existing = Path.Combine(_archiveDir, "audit-logs-2026-01.jsonl.gz");
        await File.WriteAllTextAsync(existing, "previous-run");

        await using var db = CreateDb();
        AddLog(db, new DateTime(2026, 1, 15));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3 });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(1);
        (await File.ReadAllTextAsync(existing)).Should().Be("previous-run");
        Directory.GetFiles(_archiveDir).Select(Path.GetFileName).Should().BeEquivalentTo(
            "audit-logs-2026-01.jsonl.gz", "audit-logs-2026-01.2.jsonl.gz");
        (await ReadArchiveLinesAsync("audit-logs-2026-01.2.jsonl.gz")).Should().HaveCount(1);
    }

    [Fact]
    public async Task PurgeAsync_ShouldDeleteWholeMonthAcrossBatches_InSingleArchiveFile()
    {
        await using var db = CreateDb();
        for (var i = 0; i < 5; i++)
            AddLog(db, new DateTime(2026, 1, 1).AddDays(i));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3, BatchSize = 2 });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(5);
        (await db.AuditLogs.CountAsync(x => x.Action != AuditLogRetentionJob.PurgeAction)).Should().Be(0);
        (await ReadArchiveLinesAsync("audit-logs-2026-01.jsonl.gz")).Should().HaveCount(5);
        (await db.AuditLogs.CountAsync(x => x.Action == AuditLogRetentionJob.PurgeAction)).Should().Be(1);
    }

    [Fact]
    public async Task PurgeAsync_ShouldStopAtMaxMonthsPerRun_AndContinueNextRun()
    {
        await using var db = CreateDb();
        var january = AddLog(db, new DateTime(2026, 1, 10));
        var march = AddLog(db, new DateTime(2026, 3, 10)); // ก.พ. ว่าง ต้องข้ามโดยไม่นับโควตา
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3, MaxMonthsPerRun = 1 });

        var firstRun = await job.PurgeAsync(new DateTime(2026, 9, 7));
        firstRun.Should().Be(1);
        (await db.AuditLogs.AnyAsync(x => x.Id == january)).Should().BeFalse();
        (await db.AuditLogs.AnyAsync(x => x.Id == march)).Should().BeTrue();

        var secondRun = await job.PurgeAsync(new DateTime(2026, 9, 8));
        secondRun.Should().Be(1);
        (await db.AuditLogs.AnyAsync(x => x.Id == march)).Should().BeFalse();
        Directory.GetFiles(_archiveDir).Select(Path.GetFileName).Should().BeEquivalentTo(
            "audit-logs-2026-01.jsonl.gz", "audit-logs-2026-03.jsonl.gz");
    }

    [Fact]
    public async Task PurgeAsync_WhenArchiveDisabled_ShouldDeleteWithoutWritingFiles()
    {
        await using var db = CreateDb();
        AddLog(db, new DateTime(2026, 1, 10));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var job = CreateJob(db, new AuditLogRetentionOptions { RetentionMonths = 3, ArchiveEnabled = false });

        var deleted = await job.PurgeAsync(new DateTime(2026, 9, 7));

        deleted.Should().Be(1);
        Directory.Exists(_archiveDir).Should().BeFalse();
        var purge = await db.AuditLogs.SingleAsync(x => x.Action == AuditLogRetentionJob.PurgeAction);
        purge.Description.Should().Contain("ไม่ได้สำรองไฟล์");
        using var meta = JsonDocument.Parse(purge.NewValues!);
        meta.RootElement.GetProperty("archiveFile").ValueKind.Should().Be(JsonValueKind.Null);
    }

    private async Task<string[]> ReadArchiveLinesAsync(string fileName)
    {
        await using var file = File.OpenRead(Path.Combine(_archiveDir, fileName));
        await using var gzip = new GZipStream(file, CompressionMode.Decompress);
        using var reader = new StreamReader(gzip);
        var content = await reader.ReadToEndAsync();
        return content.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static HrmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"audit-retention-{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new HrmsDbContext(options);
    }

    private AuditLogRetentionJob CreateJob(HrmsDbContext db, AuditLogRetentionOptions options)
    {
        var withPath = string.IsNullOrEmpty(options.ArchivePath)
            ? new AuditLogRetentionOptions
            {
                Enabled = options.Enabled,
                RetentionMonths = options.RetentionMonths,
                ArchiveEnabled = options.ArchiveEnabled,
                ArchivePath = _archiveDir,
                BatchSize = options.BatchSize,
                MaxMonthsPerRun = options.MaxMonthsPerRun,
            }
            : options;
        return new AuditLogRetentionJob(db, Options.Create(withPath), NullLogger<AuditLogRetentionJob>.Instance);
    }

    private static Guid AddLog(
        HrmsDbContext db, DateTime createdAt, string? oldValues = null, string description = "test")
    {
        var log = new AuditLog
        {
            CreatedAt = createdAt,
            Module = "attendance",
            EntityType = "AttendanceRecord",
            EntityId = Guid.NewGuid().ToString(),
            Action = "Update",
            Description = description,
            OldValues = oldValues,
            PerformedByActorType = AuditActorType.System,
        };
        db.AuditLogs.Add(log);
        return log.Id;
    }
}
