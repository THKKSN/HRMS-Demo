using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.RoleLabels.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Commands;

public record UpdateRoleLabelCommand(Guid Id, string Name, bool IsActive) : IRequest<RoleLabelDto>;

public class UpdateRoleLabelValidator : AbstractValidator<UpdateRoleLabelCommand>
{
    public UpdateRoleLabelValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class UpdateRoleLabelHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateRoleLabelCommand, RoleLabelDto>
{
    public async Task<RoleLabelDto> Handle(UpdateRoleLabelCommand request, CancellationToken ct)
    {
        var entity = await db.RoleLabels.FirstOrDefaultAsync(r => r.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบ Role Label");

        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้น");

        if (!currentUser.CanManageCompany(entity.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการ company นี้");

        if (request.Name != entity.Name &&
            await db.RoleLabels.AnyAsync(r => r.CompanyId == entity.CompanyId && r.Name == request.Name && r.Id != request.Id, ct))
            throw new ConflictException("DUPLICATE_ROLE_LABEL", $"ชื่อ '{request.Name}' มีอยู่แล้วในบริษัทนี้");

        entity.Name      = request.Name;
        entity.IsActive  = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new RoleLabelDto(entity.Id, entity.CompanyId, entity.Name, entity.IsActive);
    }
}
