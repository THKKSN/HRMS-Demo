using System.Text.Json;
using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Leaves.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;

public class CreateLeaveRequestHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IWorkingDayCalculator workingDayCalc,
    ILeaveNotificationService notification,
    IAuditLogService auditLog)
    : IRequestHandler<CreateLeaveRequestCommand, LeaveRequestDto>
{
    public async Task<LeaveRequestDto> Handle(CreateLeaveRequestCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var leaveType = await db.LeaveTypes
            .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.IsActive, ct)
            ?? throw new ValidationException("ไม่พบประเภทการลาที่ระบุ");

        decimal totalDays;
        if (request.TimeFrom.HasValue && request.TimeTo.HasValue)
        {
            var hours = (decimal)(request.TimeTo.Value - request.TimeFrom.Value).TotalHours;
            if (hours <= 0) throw new ValidationException("เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น");

            var shift = await db.Shifts
                .Where(s => s.CompanyId == employee.CompanyId && s.IsActive)
                .OrderBy(s => s.StartTime)
                .FirstOrDefaultAsync(ct);

            var shiftHours = shift is not null
                ? (decimal)(shift.EndTime - shift.StartTime).TotalHours
                : 8m;

            totalDays = Math.Round(hours / shiftHours, 2);
        }
        else
        {
            totalDays = workingDayCalc.Calculate(request.DateFrom, request.DateTo, request.HalfDay, WorkDayFlags.MonToFri);
        }

        if (totalDays == 0)
            throw new ValidationException("ไม่มีวันทำการในช่วงที่เลือก");

        var hasOverlap = await db.LeaveRequests.AnyAsync(x =>
            x.EmployeeId == employeeId &&
            x.Status != LeaveStatus.Rejected &&
            x.Status != LeaveStatus.Cancelled &&
            x.DateFrom <= request.DateTo &&
            x.DateTo >= request.DateFrom, ct);

        if (hasOverlap)
            throw new ConflictException("OVERLAPPING_LEAVE", "มีคำขอลาที่ทับซ้อนกับช่วงเวลาที่เลือกอยู่แล้ว");

        var year = request.DateFrom.Year;
        var balance = await db.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.LeaveTypeId == request.LeaveTypeId && b.Year == year, ct);

        if (balance is null || balance.RemainingDays < totalDays)
            throw new ConflictException("INSUFFICIENT_BALANCE", "วันลาคงเหลือไม่เพียงพอ");

        // ผู้ที่มี leave:approve-supervisor → ข้าม Supervisor stage ไปเลย เข้า PendingHr ทันที
        var canApproveSupervisor = await permService.HasPermissionAsync(currentUser, "leave:approve-supervisor", ct);
        var initialStatus = canApproveSupervisor ? LeaveStatus.PendingHr : LeaveStatus.PendingSupervisor;

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveTypeId = request.LeaveTypeId,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            HalfDay = request.TimeFrom.HasValue ? HalfDayType.Full : request.HalfDay,
            TimeFrom = request.TimeFrom,
            TimeTo = request.TimeTo,
            TotalDays = totalDays,
            Reason = request.Reason,
            AttachmentUrl = request.AttachmentUrls is { Count: > 0 }
                ? JsonSerializer.Serialize(request.AttachmentUrls)
                : null,
            Status = initialStatus,
            SupervisorId = canApproveSupervisor ? employeeId : null,
            SupervisorApprovedAt = canApproveSupervisor ? DateTime.UtcNow.AddHours(7) : null,
            SupervisorComment = canApproveSupervisor ? "อนุมัติอัตโนมัติ (ผู้ยื่นมีสิทธิ์ Supervisor)" : null,
        };

        balance.PendingDays += totalDays;

        db.LeaveRequests.Add(leaveRequest);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "leave",
            entityType:  "LeaveRequest",
            entityId:    leaveRequest.Id.ToString(),
            action:      "create",
            description: $"{employee.FirstName} {employee.LastName} ยื่นคำขอลา {leaveType.NameTh} {request.DateFrom:yyyy-MM-dd} ถึง {request.DateTo:yyyy-MM-dd} ({totalDays} วัน)",
            oldValues:   null,
            newValues:   new { leaveRequest.LeaveTypeId, leaveRequest.DateFrom, leaveRequest.DateTo, leaveRequest.HalfDay, leaveRequest.TotalDays, leaveRequest.Status },
            ct:          ct);

        await notification.EnqueueApprovalPendingAsync(leaveRequest.Id);

        return new LeaveRequestDto(
            leaveRequest.Id,
            employee.Id,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            leaveType.NameTh,
            leaveRequest.DateFrom,
            leaveRequest.DateTo,
            leaveRequest.HalfDay,
            leaveRequest.TimeFrom,
            leaveRequest.TimeTo,
            leaveRequest.TotalDays,
            leaveRequest.Reason,
            ParseUrls(leaveRequest.AttachmentUrl),
            leaveRequest.Status,
            canApproveSupervisor ? $"{employee.FirstName} {employee.LastName}".Trim() : null,
            leaveRequest.SupervisorComment,
            null,
            leaveRequest.HrComment,
            leaveRequest.CreatedAt);
    }

    // รองรับ data เก่าที่เป็น single URL string ด้วย fallback
    internal static IReadOnlyList<string> ParseUrls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return [json]; }
    }
}
