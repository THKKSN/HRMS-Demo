using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace Hrms.Application.Tests.Notifications;

public class NotificationDispatchSignalTests
{
    [Fact]
    public async Task SaveChanges_WithNewOutboxRow_SignalsDispatchOnce()
    {
        var signal = new RecordingDispatchSignal();
        await using var db = CreateContext(signal);

        db.NotificationOutboxes.Add(BuildOutbox("TicketAssigned"));
        await db.SaveChangesAsync();

        Assert.Equal(1, signal.CallCount);
    }

    [Fact]
    public async Task SaveChanges_WithoutOutboxRow_DoesNotSignalDispatch()
    {
        var signal = new RecordingDispatchSignal();
        await using var db = CreateContext(signal);

        db.Companies.Add(new Company { Name = "บริษัททดสอบ", NameEn = "Test Co" });
        await db.SaveChangesAsync();

        Assert.Equal(0, signal.CallCount);
    }

    [Fact]
    public async Task SaveChanges_WithManyOutboxRows_SignalsOncePerSave()
    {
        var signal = new RecordingDispatchSignal();
        await using var db = CreateContext(signal);

        // 1 event ที่ยิงหาผู้รับหลายคนต้องไม่ enqueue job หลายตัว
        db.NotificationOutboxes.Add(BuildOutbox("TicketAssigned"));
        db.NotificationOutboxes.Add(BuildOutbox("TicketAssigned"));
        db.NotificationOutboxes.Add(BuildOutbox("TicketAssigned"));
        await db.SaveChangesAsync();

        Assert.Equal(1, signal.CallCount);
    }

    [Fact]
    public async Task SaveChanges_CalledTwice_SignalsForEachSaveThatAddsRows()
    {
        var signal = new RecordingDispatchSignal();
        await using var db = CreateContext(signal);

        db.NotificationOutboxes.Add(BuildOutbox("TicketAssigned"));
        await db.SaveChangesAsync();

        // save รอบที่สองไม่มีแถวใหม่ ต้องไม่ส่งสัญญาณเพิ่ม
        await db.SaveChangesAsync();
        Assert.Equal(1, signal.CallCount);

        db.NotificationOutboxes.Add(BuildOutbox("TicketResolved"));
        await db.SaveChangesAsync();
        Assert.Equal(2, signal.CallCount);
    }

    [Fact]
    public async Task ExecuteInTransaction_SignalsAfterActionCompletes()
    {
        var signal = new RecordingDispatchSignal();
        await using var db = CreateContext(signal);

        var signalledInsideAction = -1;
        await db.ExecuteInTransactionAsync(async ct =>
        {
            db.NotificationOutboxes.Add(BuildOutbox("TicketClosed"));
            await db.SaveChangesAsync(ct);
            signalledInsideAction = signal.CallCount;
        });

        // in-memory provider ไม่รองรับ transaction จริง จึงยืนยันได้เพียงว่า
        // เส้นทาง ExecuteInTransactionAsync ส่งสัญญาณครบ 1 ครั้งและไม่ซ้ำ
        // ส่วนลำดับ "หลัง commit" ต้องยืนยันด้วยการทดสอบบน MySQL จริง
        Assert.Equal(1, signal.CallCount);
        Assert.True(signalledInsideAction <= 1);
    }

    [Fact]
    public async Task SaveChanges_WithoutSignalRegistered_DoesNotThrow()
    {
        // ทดสอบ path ที่ไม่ได้ inject signal (เช่น test เดิมที่เรียก new HrmsDbContext(options))
        await using var db = CreateContext(null);

        db.NotificationOutboxes.Add(BuildOutbox("TicketStarted"));
        var affected = await db.SaveChangesAsync();

        Assert.Equal(1, affected);
    }

    private static HrmsDbContext CreateContext(INotificationDispatchSignal? signal)
    {
        var options = new DbContextOptionsBuilder<HrmsDbContext>()
            .UseInMemoryDatabase($"notification-dispatch-{Guid.NewGuid():N}")
            .ConfigureWarnings(warnings =>
                warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new HrmsDbContext(options, signal);
    }

    private static NotificationOutbox BuildOutbox(string eventType) => new()
    {
        LineUserId       = $"U-{Guid.NewGuid():N}",
        EventType        = eventType,
        EntityType       = "Ticket",
        EntityId         = Guid.NewGuid(),
        EntityReference  = "TK-TEST-0001",
        PayloadJson      = """{"Message":"ทดสอบ"}""",
        DeduplicationKey = $"{eventType}:{Guid.NewGuid():N}"
    };

    private sealed class RecordingDispatchSignal : INotificationDispatchSignal
    {
        public int CallCount { get; private set; }

        public void RequestDispatch() => CallCount++;
    }
}
