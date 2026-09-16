using FluentValidation;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.AttendancePolicies.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.AttendancePolicies.Commands;

public record UpsertAttendancePolicyCommand(
    Guid CompanyId,
    int  MaxLateMinutesPerMonth,
    int  MaxLateCountPerMonth,
    int  MaxAbsenceCountPerMonth
) : IRequest<AttendancePolicyDto>;

public class UpsertAttendancePolicyCommandValidator : AbstractValidator<UpsertAttendancePolicyCommand>
{
    public UpsertAttendancePolicyCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.MaxLateMinutesPerMonth)
            .GreaterThanOrEqualTo(0).WithErrorCode("VALUE_NEGATIVE").WithMessage("The value must not be negative.")
            .LessThanOrEqualTo(1440).WithErrorCode("MAX_LATE_MINUTES_RANGE").WithMessage("The value must not exceed 1440 minutes (24 hours).");
        RuleFor(x => x.MaxLateCountPerMonth)
            .GreaterThanOrEqualTo(0).WithErrorCode("VALUE_NEGATIVE").WithMessage("The value must not be negative.")
            .LessThanOrEqualTo(31).WithErrorCode("MAX_COUNT_PER_MONTH_RANGE").WithMessage("The value must not exceed 31 times per month.");
        RuleFor(x => x.MaxAbsenceCountPerMonth)
            .GreaterThanOrEqualTo(0).WithErrorCode("VALUE_NEGATIVE").WithMessage("The value must not be negative.")
            .LessThanOrEqualTo(31).WithErrorCode("MAX_COUNT_PER_MONTH_RANGE").WithMessage("The value must not exceed 31 times per month.");
    }
}

public class UpsertAttendancePolicyHandler(IApplicationDbContext db, IScopeGuard scope, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<UpsertAttendancePolicyCommand, AttendancePolicyDto>
{
    public async Task<AttendancePolicyDto> Handle(UpsertAttendancePolicyCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "attendance:manage-policy", ct);
        await scope.ThrowIfCannotAccessAsync(request.CompanyId, ct);

        var policy = await db.AttendancePolicies
            .Include(p => p.Company)
            .FirstOrDefaultAsync(p => p.CompanyId == request.CompanyId, ct);

        string action;
        object? oldValues;

        if (policy is null)
        {
            action    = "create";
            oldValues = null;
            policy = new AttendancePolicy
            {
                CompanyId                 = request.CompanyId,
                MaxLateMinutesPerMonth    = request.MaxLateMinutesPerMonth,
                MaxLateCountPerMonth      = request.MaxLateCountPerMonth,
                MaxAbsenceCountPerMonth   = request.MaxAbsenceCountPerMonth,
                IsActive                  = true,
            };
            db.AttendancePolicies.Add(policy);
        }
        else
        {
            action    = "update";
            oldValues = new { policy.MaxLateMinutesPerMonth, policy.MaxLateCountPerMonth, policy.MaxAbsenceCountPerMonth };
            policy.MaxLateMinutesPerMonth  = request.MaxLateMinutesPerMonth;
            policy.MaxLateCountPerMonth    = request.MaxLateCountPerMonth;
            policy.MaxAbsenceCountPerMonth = request.MaxAbsenceCountPerMonth;
        }

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "attendance-policy",
            entityType:  "AttendancePolicy",
            entityId:    policy.Id.ToString(),
            action:      action,
            description: $"{(action == "create" ? "สร้าง" : "แก้ไข")}นโยบายการเข้างาน company {request.CompanyId}",
            oldValues:   oldValues,
            newValues:   new { policy.MaxLateMinutesPerMonth, policy.MaxLateCountPerMonth, policy.MaxAbsenceCountPerMonth },
            ct:          ct);

        if (policy.Company is null)
            policy.Company = await db.Companies.FirstAsync(c => c.Id == policy.CompanyId, ct);

        return ToDto(policy);
    }

    internal static AttendancePolicyDto ToDto(AttendancePolicy p) => new(
        p.Id,
        p.CompanyId,
        p.Company?.Name ?? string.Empty,
        p.MaxLateMinutesPerMonth,
        p.MaxLateCountPerMonth,
        p.MaxAbsenceCountPerMonth,
        p.IsActive);
}
