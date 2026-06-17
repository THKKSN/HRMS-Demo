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
    IWorkingDayCalculator workingDayCalc,
    ILeaveNotificationService notification)
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
            .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.IsActive && lt.CompanyId == employee.CompanyId, ct)
            ?? throw new ValidationException("ไม่พบประเภทการลาที่ระบุหรือไม่อยู่ในบริษัทของคุณ");

        var totalDays = workingDayCalc.Calculate(request.DateFrom, request.DateTo, request.HalfDay, WorkDayFlags.MonToFri);
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

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveTypeId = request.LeaveTypeId,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            HalfDay = request.HalfDay,
            TotalDays = totalDays,
            Reason = request.Reason,
            AttachmentUrl = request.AttachmentUrl,
            Status = LeaveStatus.PendingSupervisor
        };

        balance.PendingDays += totalDays;

        db.LeaveRequests.Add(leaveRequest);
        await db.SaveChangesAsync(ct);

        await notification.EnqueueApprovalPendingAsync(leaveRequest.Id);

        return new LeaveRequestDto(
            leaveRequest.Id,
            employee.Id,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            leaveType.NameTh,
            leaveRequest.DateFrom,
            leaveRequest.DateTo,
            leaveRequest.HalfDay,
            leaveRequest.TotalDays,
            leaveRequest.Reason,
            leaveRequest.AttachmentUrl,
            leaveRequest.Status,
            leaveRequest.SupervisorComment,
            leaveRequest.HrComment,
            leaveRequest.CreatedAt);
    }
}
