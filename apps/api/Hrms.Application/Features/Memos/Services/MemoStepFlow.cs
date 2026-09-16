using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Notifications;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hrms.Application.Features.Memos.Services;

// logic เดินขั้นตอนที่ใช้ร่วมกันระหว่าง CompleteMemoStep / ApproveMemoStep / ReturnMemoStep / ResubmitMemo
// (memo ต้องถูก Include(MemoType) และ Include(Requester) มาก่อนเรียก)
public static class MemoStepFlow
{
    public static string Title(Memo memo)
        => $"{memo.MemoType.Name} - {memo.MemoCategoryNameSnapshot} - {memo.MemoSubCategoryNameSnapshot}";

    // ปิด step ปัจจุบันเป็น Done แล้วเลื่อนไปขั้นถัดไป (แจ้งผู้รับผิดชอบ) — ถ้าหมดแล้วแจ้ง Supervisor
    // ปลายทางว่าพร้อมส่งมอบ; ตัว caller เป็นคน SaveChanges เอง
    public static async Task AdvanceAsync(
        IApplicationDbContext db, IMemoStepAuthorizer stepAuthorizer,
        Memo memo, MemoStepInstance actedStep, CancellationToken ct)
    {
        var memoTitle = Title(memo);

        var nextStep = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id && x.Status == MemoStepStatus.Waiting && x.SortOrder > actedStep.SortOrder)
            .OrderBy(x => x.SortOrder)
            .FirstOrDefaultAsync(ct);

        if (nextStep is not null)
        {
            nextStep.Status = MemoStepStatus.Current;
            memo.CurrentStepInstanceId = nextStep.Id;

            var recipients = await stepAuthorizer.ResolveRecipientsAsync(
                nextStep.AssigneeRoleCode, nextStep.AssigneeEmployeeId,
                memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
            AddNotifications(db, memo, recipients, "MemoStepReady",
                "memo.stepReady.toAssignee", new { memoTitle, step = nextStep.Label },
                dedupSuffix: nextStep.Id);
            return;
        }

        // ครบทุกขั้นแล้ว — แจ้ง Supervisor แผนกปลายทางว่าพร้อมกด "ส่งมอบ"
        memo.CurrentStepInstanceId = null;
        var supervisors = await stepAuthorizer.ResolveRecipientsAsync(
            RoleType.Supervisor, null,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        AddNotifications(db, memo, supervisors, "MemoStepsCompleted",
            "memo.stepsCompleted.toSupervisor", new { memoTitle },
            dedupSuffix: actedStep.Id);
    }

    /// <summary>
    /// ย้อนเรื่องกลับไปยัง <paramref name="toStep"/> — ขั้นที่ทำเสร็จไปแล้วระหว่างทางถูกล้างให้ทำใหม่ทั้งสาย
    /// </summary>
    /// <remarks>
    /// ต้องล้างขั้นกลางเป็น Waiting จริงๆ ไม่ใช่ปล่อยไว้เป็น Done เพราะ <see cref="AdvanceAsync"/>
    /// มองหาขั้นถัดไปจาก Status == Waiting เท่านั้น — ถ้าปล่อยไว้ เรื่องจะ "ลัดกลับ" ข้ามขั้นกลาง
    /// ไปหาผู้อนุมัติทันที ซึ่งเท่ากับอนุมัติเอกสารที่คำนวณจากข้อมูลชุดที่เพิ่งถูกตีตกไป
    /// </remarks>
    public static async Task ReturnToStepAsync(
        IApplicationDbContext db, IMemoStepAuthorizer stepAuthorizer,
        Memo memo, MemoStepInstance fromStep, MemoStepInstance toStep,
        string reason, Guid actorId, CancellationToken ct)
    {
        var affected = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id
                && x.SortOrder >= toStep.SortOrder && x.SortOrder <= fromStep.SortOrder)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(ct);

        var clearedWork = await DescribeClearedWorkAsync(db, affected, ct);
        ResetSteps(affected, currentStepId: toStep.Id);
        memo.CurrentStepInstanceId = toStep.Id;

        db.MemoActivities.Add(new MemoActivity
        {
            MemoId = memo.Id,
            MemoStepInstanceId = fromStep.Id,
            AuthorEmployeeId = actorId,
            Message = $"ตีกลับจากขั้นตอน '{fromStep.Label}' ไปที่ '{toStep.Label}'\nเหตุผล: {reason}{clearedWork}",
            IsSystem = true,
        });

        var recipients = await stepAuthorizer.ResolveRecipientsAsync(
            toStep.AssigneeRoleCode, toStep.AssigneeEmployeeId,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);

        // ผู้ขอต้องรู้ด้วยว่างานถอยหลัง ไม่งั้นจะเห็นสถานะ "กำลังดำเนินการ" นิ่งๆ โดยไม่รู้สาเหตุ
        AddNotifications(db, memo, WithRequester(recipients, memo), "MemoStepReturned",
            "memo.stepReturned.toAssignee",
            new { memoTitle = Title(memo), fromStep = fromStep.Label, toStep = toStep.Label, reason },
            dedupSuffix: Guid.NewGuid()); // ตีกลับซ้ำได้หลายรอบ — dedup key ต้องไม่ชนรอบก่อน
    }

    /// <summary>
    /// ย้อนเรื่องกลับถึงผู้ขอ — ขั้นตอนทั้งหมดถูกล้าง workflow หยุดรอจนผู้ขอกดส่งกลับ
    /// </summary>
    /// <remarks>
    /// ผู้ขออยู่ "ก่อนขั้นที่ 1" จึงล้างทุกขั้นตามกติกาเดินซ้ำทั้งสายเหมือนย้อนไปขั้นที่ 1
    /// ใช้เมื่อคำขอเองต้องแก้ ถ้าแค่อยากถามข้อมูลเพิ่มให้ใช้บันทึกความคืบหน้าแทน (เรื่องไม่เปลี่ยนสถานะ)
    /// </remarks>
    public static async Task ReturnToRequesterAsync(
        IApplicationDbContext db, Memo memo, MemoStepInstance fromStep,
        string reason, Guid actorId, DateTime now, CancellationToken ct)
    {
        var affected = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id && x.SortOrder <= fromStep.SortOrder)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(ct);

        var clearedWork = await DescribeClearedWorkAsync(db, affected, ct);
        ResetSteps(affected, currentStepId: null);

        memo.CurrentStepInstanceId = null;
        memo.ReturnedToRequesterAt = now;
        memo.ReturnedToRequesterReason = reason;
        memo.ReturnedFromStepInstanceId = fromStep.Id;

        db.MemoActivities.Add(new MemoActivity
        {
            MemoId = memo.Id,
            MemoStepInstanceId = fromStep.Id,
            AuthorEmployeeId = actorId,
            Message = $"ตีกลับจากขั้นตอน '{fromStep.Label}' ไปให้ผู้ขอแก้ไข\nเหตุผล: {reason}{clearedWork}",
            IsSystem = true,
        });

        AddNotifications(db, memo, WithRequester([], memo), "MemoReturnedToRequester",
            "memo.returnedToRequester.toRequester",
            new { memoTitle = Title(memo), fromStep = fromStep.Label, reason },
            dedupSuffix: Guid.NewGuid());
    }

    /// <summary>ผู้ขอส่งเรื่องกลับเข้า workflow — เดินใหม่ตั้งแต่ขั้นแรกเพราะทุกขั้นถูกล้างไปแล้ว</summary>
    public static async Task<MemoStepInstance> ResumeFromRequesterAsync(
        IApplicationDbContext db, IMemoStepAuthorizer stepAuthorizer,
        Memo memo, string? note, CancellationToken ct)
    {
        var firstStep = await db.MemoStepInstances
            .Where(x => x.MemoId == memo.Id)
            .OrderBy(x => x.SortOrder)
            .FirstOrDefaultAsync(ct)
            ?? throw new ConflictException("MEMO_STEP_NONE", "This memo has no steps to work on.");

        firstStep.Status = MemoStepStatus.Current;
        memo.CurrentStepInstanceId = firstStep.Id;
        memo.ReturnedToRequesterAt = null;
        memo.ReturnedToRequesterReason = null;
        memo.ReturnedFromStepInstanceId = null;

        db.MemoActivities.Add(new MemoActivity
        {
            MemoId = memo.Id,
            MemoStepInstanceId = firstStep.Id,
            AuthorEmployeeId = memo.RequesterId,
            Message = $"ผู้ขอส่งเรื่องกลับเข้าขั้นตอน '{firstStep.Label}'"
                + (string.IsNullOrWhiteSpace(note) ? "" : $"\nชี้แจง: {note.Trim()}"),
            IsSystem = true,
        });

        var recipients = await stepAuthorizer.ResolveRecipientsAsync(
            firstStep.AssigneeRoleCode, firstStep.AssigneeEmployeeId,
            memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        AddNotifications(db, memo, recipients, "MemoResubmitted",
            "memo.resubmitted.toAssignee",
            new { memoTitle = Title(memo), step = firstStep.Label },
            dedupSuffix: Guid.NewGuid());

        return firstStep;
    }

    // ขั้นที่ถูกย้อนต้องกลับไปเริ่มใหม่หมด — ล้างผลการทำงานเดิมทิ้ง (ค่าเดิมถูกบันทึกไว้ในการ์ด activity แล้ว)
    private static void ResetSteps(IEnumerable<MemoStepInstance> steps, Guid? currentStepId)
    {
        foreach (var step in steps)
        {
            step.Status = step.Id == currentStepId ? MemoStepStatus.Current : MemoStepStatus.Waiting;
            step.ActedAt = null;
            step.ActedByEmployeeId = null;
            step.ActionNote = null;
        }
    }

    // เก็บผลงานที่กำลังจะถูกล้างไว้ในข้อความการ์ดระบบ — ไม่งั้นชื่อคนทำ/เวลา/โน้ตหายถาวร
    private static async Task<string> DescribeClearedWorkAsync(
        IApplicationDbContext db, IReadOnlyList<MemoStepInstance> steps, CancellationToken ct)
    {
        var done = steps.Where(x => x.ActedAt is not null).ToList();
        if (done.Count == 0) return string.Empty;

        var actorIds = done.Select(x => x.ActedByEmployeeId).OfType<Guid>().Distinct().ToList();
        var actorNames = await db.Employees.AsNoTracking()
            .Where(x => actorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => $"{x.FirstName} {x.LastName}".Trim(), ct);

        var lines = done.Select(step =>
        {
            var actor = step.ActedByEmployeeId is { } id && actorNames.TryGetValue(id, out var name) ? name : "ไม่ทราบผู้ทำ";
            var note = string.IsNullOrWhiteSpace(step.ActionNote) ? "" : $"\n  โน้ตเดิม: {step.ActionNote}";
            return $"• ขั้นที่ {step.SortOrder} {step.Label} — {actor} · {step.ActedAt:dd/MM/yyyy HH:mm}{note}";
        });

        return $"\n\nผลงานเดิมที่ถูกล้างเพื่อทำใหม่:\n{string.Join("\n", lines)}";
    }

    // ต่อผู้ขอเข้าไปในรายชื่อผู้รับแจ้ง (ข้ามถ้าไม่ได้ผูก LINE หรือซ้ำกับผู้รับผิดชอบขั้นนั้นอยู่แล้ว)
    private static List<MemoNotifyRecipient> WithRequester(List<MemoNotifyRecipient> recipients, Memo memo)
    {
        if (string.IsNullOrWhiteSpace(memo.Requester.LineUserId)) return recipients;
        if (recipients.Any(x => x.EmployeeId == memo.RequesterId)) return recipients;
        return [.. recipients, new MemoNotifyRecipient(memo.RequesterId, memo.Requester.LineUserId)];
    }

    /// <param name="templateKey">คีย์ใน <c>packages/i18n/messages/&lt;locale&gt;/notifications.json</c></param>
    /// <param name="parameters">ตัวแปรของเทมเพลต — ค่าว่างทำให้บรรทัดนั้นในเทมเพลตหายไป</param>
    public static void AddNotifications(
        IApplicationDbContext db, Memo memo, IEnumerable<MemoNotifyRecipient> recipients,
        string eventType, string templateKey, object? parameters, Guid dedupSuffix)
    {
        var payloadJson = NotificationPayload.FromTemplate(templateKey, parameters).ToJson();
        foreach (var recipient in recipients)
        {
            db.NotificationOutboxes.Add(new NotificationOutbox
            {
                Channel = NotificationChannel.Line,
                RecipientEmployeeId = recipient.EmployeeId,
                LineUserId = recipient.LineUserId,
                EventType = eventType,
                EntityType = "Memo",
                EntityId = memo.Id,
                PayloadJson = payloadJson,
                DeduplicationKey = $"{eventType}:{memo.Id:N}:{dedupSuffix:N}:{recipient.EmployeeId:N}",
                Status = NotificationDeliveryStatus.Pending,
            });
        }
    }
}
