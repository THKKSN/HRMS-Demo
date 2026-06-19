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
            .Include(b => b.Employee)
            .Include(b => b.LeaveType)
            .FirstOrDefaultAsync(b => b.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹‚à¸„à¸§à¸•à¸²à¸§à¸±à¸™à¸¥à¸²");

        await scope.ThrowIfCannotAccessAsync(balance.Employee.CompanyId);

        if (request.TotalDays < balance.UsedDays + balance.PendingDays)
            throw new ConflictException("QUOTA_BELOW_USED",
                $"à¹‚à¸„à¸§à¸•à¸²à¹ƒà¸«à¸¡à¹ˆ ({request.TotalDays}) à¸•à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¸™à¹‰à¸­à¸¢à¸à¸§à¹ˆà¸²à¸§à¸±à¸™à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¹„à¸›à¹à¸¥à¹‰à¸§ ({balance.UsedDays + balance.PendingDays})");

        balance.TotalDays  = request.TotalDays;
        balance.UpdatedAt  = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new LeaveBalanceAdminDto(
            balance.Id,
            balance.EmployeeId,
            $"{balance.Employee.FirstName} {balance.Employee.LastName}".Trim(),
            balance.LeaveTypeId,
            balance.LeaveType.NameTh,
            balance.Year,
            balance.TotalDays,
            balance.UsedDays,
            balance.PendingDays,
            balance.TotalDays - balance.UsedDays - balance.PendingDays);
    }
}

