using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Services;

// หา "ขั้นตอนที่รอพนักงานคนนี้ดำเนินการ" — ใช้ร่วมกันระหว่างหน้ารายการงานกับตัวเลข badge
// เพื่อให้จำนวนบน badge ตรงกับจำนวนแถวที่ผู้ใช้เห็นจริงเสมอ
public interface IMemoStepTaskResolver
{
    Task<List<MemoStepTaskDto>> ResolveAsync(Guid employeeId, CancellationToken ct);
}

public class MemoStepTaskResolver(IApplicationDbContext db, IMemoStepAuthorizer stepAuthorizer)
    : IMemoStepTaskResolver
{
    public async Task<List<MemoStepTaskDto>> ResolveAsync(Guid employeeId, CancellationToken ct)
    {
        // ดึง step ที่เป็นคิวปัจจุบันของเรื่องที่ยังวิ่งอยู่ทั้งหมดก่อน แล้วกรองสิทธิ์รายตัวใน memory
        // (เรื่องที่ active พร้อมกันมีน้อย ไม่คุ้มแปลงกติกา scope เป็น SQL ซ้ำอีกชุด)
        var candidates = await db.MemoStepInstances.AsNoTracking()
            .Where(x => x.Status == MemoStepStatus.Current &&
                x.Memo.Status == MemoStatus.Approved && x.Memo.DeliveredAt == null)
            .Select(x => new
            {
                x.Id, x.SortOrder, x.Label, x.StepKind,
                x.AssigneeRoleCode, x.AssigneeEmployeeId,
                x.Memo.MemoNo, x.MemoId,
                MemoTypeName = x.Memo.MemoType.Name,
                x.Memo.MemoCategoryNameSnapshot, x.Memo.MemoSubCategoryNameSnapshot,
                RequesterName = x.Memo.Requester.FirstName + " " + x.Memo.Requester.LastName,
                TargetCompanyId = x.Memo.MemoType.CompanyId,
                TargetDepartmentId = x.Memo.MemoType.DepartmentId,
                x.Memo.CreatedAt,
            })
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var tasks = new List<MemoStepTaskDto>();
        foreach (var c in candidates)
        {
            var canAct = await stepAuthorizer.CanActAsync(
                employeeId, c.AssigneeRoleCode, c.AssigneeEmployeeId,
                c.TargetCompanyId, c.TargetDepartmentId, MemoApproverScope.TargetOrg, ct);
            if (canAct)
                tasks.Add(new MemoStepTaskDto(
                    c.MemoId, c.MemoNo, c.MemoTypeName,
                    c.MemoCategoryNameSnapshot, c.MemoSubCategoryNameSnapshot,
                    c.RequesterName.Trim(),
                    c.Id, c.SortOrder, c.Label, c.StepKind, c.CreatedAt));
        }
        return tasks;
    }
}
