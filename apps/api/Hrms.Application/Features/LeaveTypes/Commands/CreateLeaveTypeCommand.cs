using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.LeaveTypes.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.LeaveTypes.Commands;

public record CreateLeaveTypeCommand(
    string Code,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment) : IRequest<LeaveTypeDto>;

public class CreateLeaveTypeValidator : AbstractValidator<CreateLeaveTypeCommand>
{
    public CreateLeaveTypeValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.NameTh).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DefaultDaysPerYear).GreaterThan(0);
    }
}

public class CreateLeaveTypeHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CreateLeaveTypeCommand, LeaveTypeDto>
{
    public async Task<LeaveTypeDto> Handle(CreateLeaveTypeCommand request, CancellationToken ct)
    {
        var companyId = currentUser.CompanyId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");

        if (await db.LeaveTypes.AnyAsync(lt => lt.CompanyId == companyId && lt.Code == request.Code, ct))
            throw new ConflictException("DUPLICATE_CODE", $"รหัสประเภทลา '{request.Code}' มีอยู่แล้วในระบบ");

        var leaveType = new LeaveType
        {
            CompanyId          = companyId,
            Code               = request.Code,
            NameTh             = request.NameTh,
            NameEn             = request.NameEn,
            DefaultDaysPerYear = request.DefaultDaysPerYear,
            RequiresAttachment = request.RequiresAttachment,
            IsActive           = true,
            CreatedAt          = DateTime.UtcNow,
            UpdatedAt          = DateTime.UtcNow,
        };

        db.LeaveTypes.Add(leaveType);
        await db.SaveChangesAsync(ct);

        return new LeaveTypeDto(leaveType.Id, leaveType.Code, leaveType.NameTh, leaveType.NameEn,
            leaveType.DefaultDaysPerYear, leaveType.RequiresAttachment, leaveType.IsActive);
    }
}
