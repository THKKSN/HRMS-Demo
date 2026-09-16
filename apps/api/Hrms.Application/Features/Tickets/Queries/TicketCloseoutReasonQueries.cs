using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Tickets.Commands;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

/// <summary>รายการสำหรับหน้าตั้งค่า: เหตุผลของแผนกที่เลือก + เหตุผลระดับบริษัทที่แผนกนี้ใช้ร่วมด้วย</summary>
public record GetManagedTicketCloseoutReasonsQuery(Guid CompanyId, Guid DepartmentId)
    : IRequest<IReadOnlyList<TicketCloseoutReasonDto>>;

public class GetManagedTicketCloseoutReasonsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetManagedTicketCloseoutReasonsQuery, IReadOnlyList<TicketCloseoutReasonDto>>
{
    public async Task<IReadOnlyList<TicketCloseoutReasonDto>> Handle(GetManagedTicketCloseoutReasonsQuery request, CancellationToken ct)
    {
        await TicketManagementAccess.EnsureDepartmentAsync(
            db, currentUser, permissionService, TicketCloseoutReasonSupport.ManagePermission, request.CompanyId, request.DepartmentId, ct);

        var reasons = await db.TicketCloseoutReasons
            .AsNoTracking()
            .Include(r => r.Categories)
            .Where(r => r.CompanyId == request.CompanyId &&
                        r.Kind == TicketCloseoutReason.ProblemTypeKind &&
                        (r.DepartmentId == null || r.DepartmentId == request.DepartmentId))
            .OrderBy(r => r.DepartmentId == null ? 1 : 0)
            .ThenBy(r => r.SortOrder)
            .ThenBy(r => r.Name)
            .ToListAsync(ct);
        return reasons.Select(TicketCloseoutReasonSupport.ToDto).ToList();
    }
}

/// <summary>
/// ตัวเลือกตอนปิดงานของ ticket ใบหนึ่ง กติกา:
/// อยู่บริษัทปลายทาง + เปิดใช้งาน + (ระดับบริษัท หรือ ตรงแผนกปลายทาง) + (ไม่ผูกหมวด หรือ ผูกหมวดที่ตรงกับ ticket)
/// ค่าที่ ticket เลือกไว้แล้วจะติดมาด้วยเสมอ (flag IsLegacySelection ถ้าหลุดกติกาไปแล้ว) เพื่อไม่ให้ฟอร์มแสดงค่าว่างทั้งที่มีข้อมูล
/// </summary>
public record GetTicketCloseoutReasonOptionsQuery(Guid TicketId) : IRequest<IReadOnlyList<TicketCloseoutReasonOptionDto>>;

public class GetTicketCloseoutReasonOptionsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : IRequestHandler<GetTicketCloseoutReasonOptionsQuery, IReadOnlyList<TicketCloseoutReasonOptionDto>>
{
    public async Task<IReadOnlyList<TicketCloseoutReasonOptionDto>> Handle(GetTicketCloseoutReasonOptionsQuery request, CancellationToken ct)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TicketId, ct)
            ?? throw new NotFoundException("Ticket", request.TicketId, "TICKET_NOT_FOUND");
        await TicketAccess.EnsureCanViewAsync(db, currentUser, permissionService, ticket, ct);

        var candidates = await db.TicketCloseoutReasons
            .AsNoTracking()
            .Include(r => r.Categories)
            .Where(r => r.CompanyId == ticket.TargetCompanyId &&
                        r.Kind == TicketCloseoutReason.ProblemTypeKind &&
                        (r.Id == ticket.CloseoutReasonId ||
                         (r.IsActive && (r.DepartmentId == null || r.DepartmentId == ticket.TargetDepartmentId))))
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Name)
            .ToListAsync(ct);

        return candidates
            .Select(reason =>
            {
                var inScope = reason.IsActive
                    && (reason.DepartmentId == null || reason.DepartmentId == ticket.TargetDepartmentId)
                    && (reason.Categories.Count == 0 ||
                        (ticket.CategoryId.HasValue && reason.Categories.Any(link => link.CategoryId == ticket.CategoryId.Value)));
                var isSelected = reason.Id == ticket.CloseoutReasonId;
                return (reason, inScope, isSelected);
            })
            .Where(item => item.inScope || item.isSelected)
            .Select(item => new TicketCloseoutReasonOptionDto(
                item.reason.Id,
                item.reason.Name,
                item.reason.Description,
                item.reason.DepartmentId == null,
                item.isSelected && !item.inScope,
                item.reason.RequiresResolutionNote,
                item.reason.RequiresCompletionEvidence,
                item.reason.NameEn,
                item.reason.NameId))
            .ToList();
    }
}
