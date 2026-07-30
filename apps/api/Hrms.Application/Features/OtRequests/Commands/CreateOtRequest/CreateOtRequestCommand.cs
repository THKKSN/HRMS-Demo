using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.OtRequests.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.OtRequests.Commands.CreateOtRequest;

public record CreateOtRequestCommand(
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? Reason) : IRequest<OtRequestDto>;

public class CreateOtRequestValidator : AbstractValidator<CreateOtRequestCommand>
{
    public CreateOtRequestValidator()
    {
        RuleFor(x => x.Date).NotEmpty();
        RuleFor(x => x.StartTime).NotEmpty();
        RuleFor(x => x.EndTime).NotEmpty()
            .Must((cmd, end) => end > cmd.StartTime)
            .WithMessage("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

public class CreateOtRequestHandler(IApplicationDbContext db, ICurrentUser currentUser, IAuditLogService auditLog)
    : IRequestHandler<CreateOtRequestCommand, OtRequestDto>
{
    public async Task<OtRequestDto> Handle(CreateOtRequestCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        var employee = await db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลพนักงาน");

        // ตรวจซ้ำ OT วันเดิม
        var duplicate = await db.OtRequests.AnyAsync(
            o => o.EmployeeId == employeeId &&
                 o.Date == request.Date &&
                 o.Status != OtStatus.Cancelled &&
                 o.Status != OtStatus.Rejected, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_OT", "มีคำขอ OT ในวันนี้อยู่แล้ว");

        // คำนวณชั่วโมง OT
        var totalHours = (decimal)(request.EndTime - request.StartTime).TotalHours;

        // กำหนด rate type ตามวันใน calendar
        var dayOfWeek = request.Date.DayOfWeek;
        var isHoliday = await db.Holidays.AnyAsync(
            h => h.Date == request.Date && h.IsActive, ct);
        var rateType = isHoliday ? OtRateType.Holiday
            : (dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday) ? OtRateType.Weekend
            : OtRateType.Weekday;

        var ot = new OtRequest
        {
            EmployeeId = employeeId,
            Date       = request.Date,
            StartTime  = request.StartTime,
            EndTime    = request.EndTime,
            TotalHours = totalHours,
            RateType   = rateType,
            Reason     = request.Reason,
            Status     = OtStatus.PendingSupervisor,
        };

        db.OtRequests.Add(ot);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "ot",
            entityType:  "OtRequest",
            entityId:    ot.Id.ToString(),
            action:      "create",
            description: $"{employee.FirstName} {employee.LastName} ยื่นขอ OT วันที่ {ot.Date:yyyy-MM-dd} {ot.StartTime:HH\\:mm}–{ot.EndTime:HH\\:mm} ({ot.TotalHours} ชม.)",
            oldValues:   null,
            newValues:   new { ot.Date, ot.StartTime, ot.EndTime, ot.TotalHours, ot.RateType, ot.Reason },
            ct:          ct);

        return OtRequestMapper.ToDto(ot, employee.Department?.Name, null, null);
    }
}
