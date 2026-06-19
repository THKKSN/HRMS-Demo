using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveBalances.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveBalances.Commands.CreateLeaveBalance;

public record CreateLeaveBalanceCommand(
    Guid EmployeeId,
    Guid LeaveTypeId,
    int Year,
    decimal TotalDays) : IRequest<LeaveBalanceAdminDto>;

public class CreateLeaveBalanceValidator : AbstractValidator<CreateLeaveBalanceCommand>
{
    public CreateLeaveBalanceValidator()
    {
        RuleFor(x => x.Year).GreaterThan(2000);
        RuleFor(x => x.TotalDays).GreaterThanOrEqualTo(0);
    }
}

public class CreateLeaveBalanceHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<CreateLeaveBalanceCommand, LeaveBalanceAdminDto>
{
    public async Task<LeaveBalanceAdminDto> Handle(CreateLeaveBalanceCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸žà¸™à¸±à¸à¸‡à¸²à¸™");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var leaveType = await db.LeaveTypes
            .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.IsActive, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸›à¸£à¸°à¹€à¸ à¸—à¸¥à¸²");

        var exists = await db.LeaveBalances.AnyAsync(
            b => b.EmployeeId == request.EmployeeId &&
                 b.LeaveTypeId == request.LeaveTypeId &&
                 b.Year == request.Year, ct);

        if (exists)
            throw new ConflictException("BALANCE_ALREADY_EXISTS", "à¸¡à¸µà¹‚à¸„à¸§à¸•à¸²à¸‚à¸­à¸‡à¸žà¸™à¸±à¸à¸‡à¸²à¸™à¹à¸¥à¸°à¸›à¸£à¸°à¹€à¸ à¸—à¸¥à¸²à¸™à¸µà¹‰à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§");

        var balance = new LeaveBalance
        {
            EmployeeId  = request.EmployeeId,
            LeaveTypeId = request.LeaveTypeId,
            Year        = request.Year,
            TotalDays   = request.TotalDays,
            UsedDays    = 0,
            PendingDays = 0,
        };

        db.LeaveBalances.Add(balance);
        await db.SaveChangesAsync(ct);

        return new LeaveBalanceAdminDto(
            balance.Id,
            balance.EmployeeId,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            balance.LeaveTypeId,
            leaveType.NameTh,
            balance.Year,
            balance.TotalDays,
            0,
            0,
            balance.TotalDays);
    }
}

