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
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId, ct)
            ?? throw new KeyNotFoundException("ไม่พบพนักงาน");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        var leaveType = await db.LeaveTypes
            .FirstOrDefaultAsync(lt => lt.Id == request.LeaveTypeId && lt.IsActive, ct)
            ?? throw new KeyNotFoundException("ไม่พบประเภทการลา");

        var exists = await db.LeaveBalances.AnyAsync(
            b => b.EmployeeId == request.EmployeeId &&
                 b.LeaveTypeId == request.LeaveTypeId &&
                 b.Year == request.Year, ct);

        if (exists)
            throw new ConflictException("BALANCE_ALREADY_EXISTS", "มีสิทธิ์ของพนักงานและประเภทการลานี้อยู่แล้ว");

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
            employee.EmployeeCode,
            $"{employee.FirstName} {employee.LastName}".Trim(),
            employee.Department?.Name,
            balance.LeaveTypeId,
            leaveType.NameTh,
            balance.Year,
            balance.TotalDays,
            0,
            0,
            balance.TotalDays);
    }
}
