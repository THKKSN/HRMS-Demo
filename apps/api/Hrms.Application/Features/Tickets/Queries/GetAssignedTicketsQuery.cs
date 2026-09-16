using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Models;
using Hrms.Application.Features.Tickets.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Tickets.Queries;

/// <summary>ขอบเขตงานของหน้า Assigned — แยกตามสถานะของแถวมอบหมาย ไม่ใช่สถานะใบแจ้งเรื่อง</summary>
public enum AssignedTicketScope
{
    /// <summary>งานที่ยังถืออยู่ (assignment ยัง active)</summary>
    Current,
    /// <summary>ประวัติงาน — เคยถือแต่ถูกเปลี่ยนตัว/ถอนออกจากทีมแล้ว</summary>
    History,
    /// <summary>ทั้งหมด — รวมทั้งที่ยังถืออยู่และที่ผ่านมาแล้ว</summary>
    All
}

public record GetAssignedTicketsQuery(
    TicketStatus? Status,
    string? Search,
    bool History = false,
    TicketRequestType? RequestType = null,
    int Page = 1,
    int PageSize = 20,
    AssignedTicketScope? Scope = null) : IRequest<PagedResult<AssignedTicketItemDto>>;

public class GetAssignedTicketsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissions)
    : IRequestHandler<GetAssignedTicketsQuery, PagedResult<AssignedTicketItemDto>>
{
    public async Task<PagedResult<AssignedTicketItemDto>> Handle(GetAssignedTicketsQuery request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permissions, "ticket:view-assigned", ct);
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        // client เก่ายังส่ง history=true/false มา — ใช้เป็น fallback เมื่อไม่ได้ระบุ scope
        var scope = request.Scope ??
            (request.History ? AssignedTicketScope.History : AssignedTicketScope.Current);

        // รวมงานที่เป็นผู้รับผิดชอบหลักและงานที่ถูกดึงเข้าร่วมทีม — UI แยกด้วย MemberRole
        var mine = db.TicketAssignments.AsNoTracking()
            .Where(a => a.AssignedToEmployeeId == employeeId);
        var assignments = scope switch
        {
            AssignedTicketScope.Current => mine.Where(a => a.IsActive),
            AssignedTicketScope.History => mine.Where(a => !a.IsActive),
            // "ทั้งหมด" รวมสองฝั่งเข้าด้วยกัน ใบเดียวอาจมีหลายแถว (ถูกเปลี่ยนตัวออกแล้วได้กลับมา)
            // เอาเฉพาะแถวล่าสุดของแต่ละใบ ไม่งั้นรายการจะซ้ำ
            _ => mine.Where(a => !mine.Any(other =>
                other.TicketId == a.TicketId &&
                (other.AssignedAt > a.AssignedAt ||
                    (other.AssignedAt == a.AssignedAt && other.Id > a.Id))))
        };
        if (request.Status.HasValue)
            assignments = assignments.Where(a => a.Ticket.Status == request.Status.Value);
        if (request.RequestType.HasValue)
            assignments = assignments.Where(a => a.Ticket.RequestType == request.RequestType.Value);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            assignments = assignments.Where(a =>
                a.Ticket.TicketNo.ToLower().Contains(search) ||
                a.Ticket.Title.ToLower().Contains(search) ||
                (a.Ticket.RequesterEmployee != null &&
                    (a.Ticket.RequesterEmployee.FirstName.ToLower().Contains(search) ||
                     a.Ticket.RequesterEmployee.LastName.ToLower().Contains(search))) ||
                (a.Ticket.RequesterNameSnapshot != null &&
                    a.Ticket.RequesterNameSnapshot.ToLower().Contains(search)) ||
                (a.Ticket.RequesterOrganizationSnapshot != null &&
                    a.Ticket.RequesterOrganizationSnapshot.ToLower().Contains(search)) ||
                (a.Ticket.VehicleText != null && a.Ticket.VehicleText.ToLower().Contains(search)) ||
                (a.Ticket.LocationText != null && a.Ticket.LocationText.ToLower().Contains(search)));
        }

        var totalCount = await assignments.CountAsync(ct);
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var rows = await assignments
            .OrderByDescending(a => a.AssignedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                Id = a.Ticket.Id,
                a.Ticket.TicketNo,
                a.Ticket.Title,
                a.Ticket.Status,
                a.Ticket.Priority,
                a.Ticket.RequestType,
                a.Ticket.SourceChannel,
                a.Ticket.RequesterEmployeeId,
                a.Ticket.ExternalReporterId,
                RequesterName = a.Ticket.RequesterEmployee != null
                    ? (a.Ticket.RequesterEmployee.FirstName + " " + a.Ticket.RequesterEmployee.LastName).Trim()
                    : a.Ticket.RequesterNameSnapshot ?? a.Ticket.RequesterLineDisplayNameSnapshot ?? "External requester",
                RequesterNickname = a.Ticket.RequesterEmployee != null
                    ? a.Ticket.RequesterEmployee.Nickname
                    : a.Ticket.RequesterNicknameSnapshot,
                RequesterOrganization = a.Ticket.RequesterOrganizationSnapshot ??
                    (a.Ticket.SourceCompany != null ? a.Ticket.SourceCompany.Name : null),
                // External ticket ใช้หมวดจาก external taxonomy — coalesce ให้หน้า assigned เห็นชื่อหมวดเสมอไม่ว่ามาจากฝั่งไหน
                CategoryName = a.Ticket.Category != null
                    ? a.Ticket.Category.Name
                    : a.Ticket.ExternalTicketCategory != null ? a.Ticket.ExternalTicketCategory.Name : null,
                TopicName = a.Ticket.Topic != null
                    ? a.Ticket.Topic.Name
                    : a.Ticket.ExternalTicketTopic != null ? a.Ticket.ExternalTicketTopic.Name : null,
                a.Ticket.VehicleText,
                a.Ticket.LocationText,
                a.AssignedAt,
                a.Ticket.WorkStartedAt,
                a.Ticket.WorkflowBoardStepsJson,
                a.Ticket.WorkflowCurrentStepKey,
                a.Ticket.CurrentWorkState,
                a.Ticket.CurrentBlockerReason,
                a.Ticket.CurrentNextAction,
                a.Ticket.UpdatedAt,
                a.MemberRole
            })
            .ToListAsync(ct);

        var items = rows
            .Select(a =>
            {
                var currentStepLabel = TicketWorkflowRuntime.DeserializeBoardSteps(a.WorkflowBoardStepsJson)
                    .FirstOrDefault(step => step.Key == a.WorkflowCurrentStepKey)?.Label;

                return new AssignedTicketItemDto(
                    a.Id,
                    a.TicketNo,
                    a.Title,
                    a.Status,
                    a.Priority,
                    a.RequesterName,
                    new TicketRequesterDto(
                        a.RequestType,
                        a.RequesterEmployeeId,
                        a.ExternalReporterId,
                        a.RequesterName,
                        a.RequesterNickname,
                        null,
                        null,
                        a.RequesterOrganization),
                    a.SourceChannel,
                    a.CategoryName,
                    a.TopicName,
                    a.VehicleText,
                    a.LocationText,
                    a.AssignedAt,
                    a.WorkStartedAt,
                    a.WorkflowCurrentStepKey,
                    currentStepLabel,
                    a.CurrentWorkState,
                    a.CurrentBlockerReason,
                    a.CurrentNextAction,
                    a.UpdatedAt,
                    a.MemberRole);
            })
            .ToList();

        return new PagedResult<AssignedTicketItemDto>(items, totalCount, page, pageSize);
    }
}
