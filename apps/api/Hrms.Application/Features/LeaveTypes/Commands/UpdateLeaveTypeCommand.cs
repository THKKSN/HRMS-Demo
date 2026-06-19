using FluentValidation;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveTypes.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record UpdateLeaveTypeCommand(
    Guid Id,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment) : IRequest<LeaveTypeDto>;

public class UpdateLeaveTypeValidator : AbstractValidator<UpdateLeaveTypeCommand>
{
    public UpdateLeaveTypeValidator()
    {
        RuleFor(x => x.NameTh).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultDaysPerYear).GreaterThan(0);
    }
}

public class UpdateLeaveTypeHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<UpdateLeaveTypeCommand, LeaveTypeDto>
{
    public async Task<LeaveTypeDto> Handle(UpdateLeaveTypeCommand request, CancellationToken ct)
    {
        var leaveType = await db.LeaveTypes.FirstOrDefaultAsync(lt => lt.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸›à¸£à¸°à¹€à¸ à¸—à¸à¸²à¸£à¸¥à¸²");

        await scope.ThrowIfCannotAccessAsync(leaveType.CompanyId);

        leaveType.NameTh             = request.NameTh;
        leaveType.NameEn             = request.NameEn;
        leaveType.DefaultDaysPerYear = request.DefaultDaysPerYear;
        leaveType.RequiresAttachment = request.RequiresAttachment;
        leaveType.UpdatedAt          = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new LeaveTypeDto(leaveType.Id, leaveType.Code, leaveType.NameTh, leaveType.NameEn,
            leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment, leaveType.IsActive);
    }
}

