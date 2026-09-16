using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Services;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoByIdQuery(Guid Id) : IRequest<MemoDto>;

public class GetMemoByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IMemoStepAuthorizer stepAuthorizer)
    : IRequestHandler<GetMemoByIdQuery, MemoDto>
{
    public async Task<MemoDto> Handle(GetMemoByIdQuery request, CancellationToken ct)
    {
        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.ApprovedByEmployee)
            .Include(x => x.AcknowledgedByEmployee)
            .Include(x => x.DeliveredByEmployee)
            .Include(x => x.ReceivedByEmployee)
            .Include(x => x.FirstApproverEmployeeSnapshot)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new NotFoundException("Memo", request.Id, "MEMO_NOT_FOUND");

        var stepEntities = await db.MemoStepInstances.AsNoTracking()
            .Include(x => x.AssigneeEmployee)
            .Include(x => x.ActedByEmployee)
            .Where(x => x.MemoId == memo.Id)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(ct);

        var attachmentEntities = await db.MemoAttachments.AsNoTracking()
            .Include(x => x.UploadedByEmployee)
            .Where(x => x.MemoId == memo.Id)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

        var activityEntities = await db.MemoActivities.AsNoTracking()
            .Include(x => x.AuthorEmployee)
            .Where(x => x.MemoId == memo.Id)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

        // สิทธิ์ทำ step ปัจจุบัน / เพิ่ม activity ของ user ที่กำลังดู — คำนวณฝั่ง server เพื่อไม่ให้
        // frontend ต้อง replicate กติกา scope
        var canActOnCurrentStep = false;
        var employeeId = currentUser.EmployeeId;
        var currentStep = stepEntities.FirstOrDefault(x => x.Status == MemoStepStatus.Current);
        var stepsRunning = memo.Status == MemoStatus.Approved && memo.AcknowledgedAt is not null && memo.DeliveredAt is null;
        if (employeeId is { } viewerId && currentStep is not null && stepsRunning)
        {
            canActOnCurrentStep = await stepAuthorizer.CanActAsync(
                viewerId, currentStep.AssigneeRoleCode, currentStep.AssigneeEmployeeId,
                memo.MemoType.CompanyId, memo.MemoType.DepartmentId, MemoApproverScope.TargetOrg, ct);
        }

        var canAddActivity = false;
        if (employeeId is { } activityViewerId && memo.Status != MemoStatus.Rejected && stepEntities.Count > 0)
        {
            canAddActivity = await AddMemoActivityHandler.CanAddActivityAsync(
                db, stepAuthorizer, memo, activityViewerId, ct);
        }

        // เรื่องที่ถูกตีกลับมาหาผู้ขอ ต้องให้เจ้าของเรื่องกดส่งกลับเองถึงจะเดินต่อ
        var canResubmit = memo.ReturnedToRequesterAt is not null
            && memo.Status == MemoStatus.Approved
            && memo.DeliveredAt is null
            && employeeId is { } resumeViewerId
            && (memo.RequesterId == resumeViewerId || currentUser.HasRole(RoleType.Admin));

        var stepLabelById = stepEntities.ToDictionary(x => x.Id, x => x.Label);
        var returnTargets = BuildReturnTargets(stepEntities, currentStep, memo, stepsRunning);

        var steps = stepEntities.Select(x => new MemoStepInstanceDto(
            x.Id, x.SortOrder, x.Label, x.StepKind, x.Status,
            x.AssigneeRoleCode, x.AssigneeEmployeeId,
            x.AssigneeEmployee is null ? null : FullName(x.AssigneeEmployee),
            x.ActedAt,
            x.ActedByEmployee is null ? null : FullName(x.ActedByEmployee),
            x.ActionNote,
            CanAct: x.Status == MemoStepStatus.Current && canActOnCurrentStep,
            CanReturn: x.Id == currentStep?.Id && returnTargets.Count > 0,
            ReturnTargets: x.Id == currentStep?.Id && returnTargets.Count > 0 ? returnTargets : null))
            .ToList();

        var attachments = attachmentEntities.Select(ToAttachmentDto).ToList();

        var activities = activityEntities.Select(x => new MemoActivityDto(
            x.Id, x.Message, x.IsSystem,
            x.MemoStepInstanceId,
            x.MemoStepInstanceId is { } stepId && stepLabelById.TryGetValue(stepId, out var label) ? label : null,
            x.AuthorEmployee is null ? null : FullName(x.AuthorEmployee),
            x.CreatedAt,
            attachmentEntities.Where(a => a.MemoActivityId == x.Id).Select(ToAttachmentDto).ToList(),
            // เรื่องที่ไม่อนุมัติแล้วล็อกทั้งใบ — กติกาเดียวกับ UpdateMemoActivityHandler
            CanEdit: memo.Status != MemoStatus.Rejected
                && employeeId is { } editorId
                && UpdateMemoActivityHandler.CanEdit(x, editorId, currentUser)))
            .ToList();

        return new MemoDto(
            memo.Id, memo.MemoNo, memo.MemoTypeId, memo.MemoType.Name,
            memo.MemoCategoryId, memo.MemoCategoryNameSnapshot,
            memo.MemoSubCategoryId, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, memo.RequesterId, FullName(memo.Requester),
            memo.CompanyId, memo.Company.Name, memo.DepartmentId, memo.Department.Name, memo.Status,
            memo.ApprovedAt,
            memo.ApprovedByEmployee is null ? null : FullName(memo.ApprovedByEmployee),
            memo.ApproveComment,
            memo.RejectedAt, memo.RejectReason,
            memo.AcknowledgedAt,
            memo.AcknowledgedByEmployee is null ? null : FullName(memo.AcknowledgedByEmployee),
            memo.DeliveredAt,
            memo.DeliveredByEmployee is null ? null : FullName(memo.DeliveredByEmployee),
            memo.ReceivedAt,
            memo.ReceivedByEmployee is null ? null : FullName(memo.ReceivedByEmployee),
            memo.CreatedAt,
            memo.FirstApproverRoleCodeSnapshot,
            memo.FirstApproverEmployeeSnapshot is null ? null : FullName(memo.FirstApproverEmployeeSnapshot),
            steps, attachments, activities,
            canActOnCurrentStep, canAddActivity,
            memo.ReturnedToRequesterAt, memo.ReturnedToRequesterReason, canResubmit);
    }

    // ปลายทางที่ย้อนได้ของขั้นปัจจุบัน — กติกาเดียวกับ ReturnMemoStepHandler.ResolveTargetAsync
    //   Approval = ทุกขั้นก่อนหน้า + ผู้ขอ · Work = ขั้นก่อนหน้าติดกันขั้นเดียว
    private static List<MemoReturnTargetDto> BuildReturnTargets(
        List<MemoStepInstance> steps, MemoStepInstance? currentStep, Memo memo, bool stepsRunning)
    {
        if (currentStep is null || !stepsRunning) return [];

        var earlier = steps.Where(x => x.SortOrder < currentStep.SortOrder).OrderBy(x => x.SortOrder).ToList();

        if (currentStep.StepKind != MemoStepKind.Approval)
        {
            var previous = earlier.LastOrDefault();
            return previous is null ? [] : [new MemoReturnTargetDto(previous.Id, previous.Label, previous.SortOrder)];
        }

        // ผู้ขออยู่ก่อนขั้นที่ 1 จึงเป็นรายการแรก — ปลายรายการคือขั้นก่อนหน้าติดกัน (ค่า default ของ UI)
        List<MemoReturnTargetDto> targets = [new(null, $"ผู้ขอ · {FullName(memo.Requester)}", 0)];
        targets.AddRange(earlier.Select(x => new MemoReturnTargetDto(x.Id, x.Label, x.SortOrder)));
        return targets;
    }

    private static MemoAttachmentDto ToAttachmentDto(MemoAttachment x) => new(
        x.Id, x.Url, x.FileName, x.ContentType, x.SizeBytes,
        x.MemoStepInstanceId, x.MemoActivityId,
        x.UploadedByEmployee is null ? null : FullName(x.UploadedByEmployee),
        x.CreatedAt);

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
