using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.MemoReports;

// ภาพรวม Memo สำหรับ dashboard — "หัวข้อที่ถูกขอมากที่สุด" + ยอดตามสถานะ
// TopLimit = จำนวนหัวข้อสูงสุดที่คืน (dashboard ใช้พื้นที่จำกัด ไม่ต้องส่งทั้งหมด)
public record GetMemoOverviewQuery(MemoReportFilter Filter, int TopLimit = 10) : IRequest<MemoOverviewDto>;

public class GetMemoOverviewHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permissions)
    : IRequestHandler<GetMemoOverviewQuery, MemoOverviewDto>
{
    public async Task<MemoOverviewDto> Handle(GetMemoOverviewQuery request, CancellationToken ct)
    {
        var scoped = await MemoReportAccess.ApplyScopeAsync(db, currentUser, permissions, ct);
        var filtered = MemoReportAccess.ApplyFilters(scoped, request.Filter);

        // ดึงเฉพาะฟิลด์ที่ใช้จัดกลุ่ม/นับ — เรื่องหนึ่งมี Detail ยาว ไม่ควรลากมาทั้งก้อน
        var memos = await filtered
            .Select(x => new
            {
                x.MemoTypeId,
                MemoTypeName = x.MemoType.Name,
                MemoTypeNameEn = x.MemoType.NameEn,
                MemoTypeNameId = x.MemoType.NameId,
                CategoryName = x.MemoCategoryNameSnapshot,
                SubCategoryName = x.MemoSubCategoryNameSnapshot,
                TargetCompanyName = x.MemoType.Company.Name,
                TargetCompanyNameEn = x.MemoType.Company.NameEn,
                TargetCompanyNameId = x.MemoType.Company.NameId,
                TargetDepartmentName = x.MemoType.Department.Name,
                TargetDepartmentNameEn = x.MemoType.Department.NameEn,
                TargetDepartmentNameId = x.MemoType.Department.NameId,
                x.Status,
                x.ReceivedAt,
            })
            .ToListAsync(ct);

        var topics = memos
            .GroupBy(x => new
            {
                x.MemoTypeId, x.MemoTypeName, x.CategoryName, x.SubCategoryName,
                x.TargetCompanyName, x.TargetDepartmentName,
            })
            .Select(g => new MemoTopicItemDto(
                g.Key.MemoTypeId, g.Key.MemoTypeName, g.Key.CategoryName, g.Key.SubCategoryName,
                g.Key.TargetCompanyName, g.Key.TargetDepartmentName,
                g.Count(),
                g.Count(x => x.Status == MemoStatus.Pending),
                g.Count(x => x.Status == MemoStatus.Approved && x.ReceivedAt == null),
                g.Count(x => x.ReceivedAt != null),
                g.Count(x => x.Status == MemoStatus.Rejected),
                // ชื่ออีกสองภาษาหยิบจากแถวแรกของกลุ่ม — ทุกแถวคือ memo type / บริษัท / แผนก เดียวกันอยู่แล้ว
                g.First().MemoTypeNameEn, g.First().MemoTypeNameId,
                g.First().TargetCompanyNameEn, g.First().TargetCompanyNameId,
                g.First().TargetDepartmentNameEn, g.First().TargetDepartmentNameId))
            .OrderByDescending(x => x.TotalCount)
            .ThenBy(x => x.MemoTypeName)
            .Take(Math.Clamp(request.TopLimit, 1, 50))
            .ToList();

        return new MemoOverviewDto(
            memos.Count,
            memos.Count(x => x.Status == MemoStatus.Pending),
            memos.Count(x => x.Status == MemoStatus.Approved && x.ReceivedAt == null),
            memos.Count(x => x.ReceivedAt != null),
            memos.Count(x => x.Status == MemoStatus.Rejected),
            topics,
            MemoReportAccess.Meta(request.Filter, currentUser));
    }
}
