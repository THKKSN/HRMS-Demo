using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.RoleLabels.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Commands;

public record CreateRoleLabelCommand(Guid CompanyId, string Name) : IRequest<RoleLabelDto>;

public class CreateRoleLabelValidator : AbstractValidator<CreateRoleLabelCommand>
{
    public CreateRoleLabelValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class CreateRoleLabelHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CreateRoleLabelCommand, RoleLabelDto>
{
    public async Task<RoleLabelDto> Handle(CreateRoleLabelCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ HR / Admin เท่านั้น");

        if (!currentUser.CanManageCompany(request.CompanyId))
            throw new AppForbiddenException("ไม่มีสิทธิ์จัดการ company นี้");

        if (await db.RoleLabels.AnyAsync(r => r.CompanyId == request.CompanyId && r.Name == request.Name, ct))
            throw new ConflictException("DUPLICATE_ROLE_LABEL", $"ชื่อ '{request.Name}' มีอยู่แล้วในบริษัทนี้");

        var entity = new RoleLabel
        {
            CompanyId = request.CompanyId,
            Name      = request.Name,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.RoleLabels.Add(entity);
        await db.SaveChangesAsync(ct);

        return new RoleLabelDto(entity.Id, entity.CompanyId, entity.Name, entity.IsActive);
    }
}
