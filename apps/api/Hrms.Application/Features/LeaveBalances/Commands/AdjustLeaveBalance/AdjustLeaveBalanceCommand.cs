using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveBalances.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveBalances.Commands.AdjustLeaveBalance;

public record AdjustLeaveBalanceCommand(Guid Id, decimal TotalDays) : IRequest<LeaveBalanceAdminDto>;

public class AdjustLeaveBalanceValidator : AbstractValidator<AdjustLeaveBalanceCommand>
{
    public AdjustLeaveBalanceValidator()
    {
        RuleFor(x => x.TotalDays).GreaterThanOrEqualTo(0);
    }
}

public class AdjustLeaveBalanceHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<AdjustLeaveBalanceCommand, LeaveBalanceAdminDto>
{
    public async Task<LeaveBalanceAdminDto> Handle(AdjustLeaveBalanceCommand request, CancellationToken ct)
    {
        var balance = await db.LeaveBalances
            .Include(b => b.Employee).ThenInclude(e => e.Department)
            .Include(b => b.LeaveType)
            .FirstOrDefaultAsync(b => b.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลสิทธิ์วันลา");

        await scope.ThrowIfCannotAccessAsync(balance.Employee.CompanyId);

        if (request.TotalDays < balance.UsedDays + balance.PendingDays)
            throw new ConflictException("QUOTA_BELOW_USED",
                $"สิทธิ์ใหม่ ({request.TotalDays}) ต้องไม่น้อยกว่าวันที่ใช้ไปแล้ว ({balance.UsedDays + balance.PendingDays})");

        balance.TotalDays = request.TotalDays;
        balance.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new LeaveBalanceAdminDto(
            balance.Id,
            balance.EmployeeId,
            balance.Employee.EmployeeCode,
            $"{balance.Employee.FirstName} {balance.Employee.LastName}".Trim(),
            balance.Employee.Department?.Name,
            balance.LeaveTypeId,
            balance.LeaveType.NameTh,
            balance.Year,
            balance.TotalDays,
            balance.UsedDays,
            balance.PendingDays,
            balance.TotalDays - balance.UsedDays - balance.PendingDays);
    }
}
