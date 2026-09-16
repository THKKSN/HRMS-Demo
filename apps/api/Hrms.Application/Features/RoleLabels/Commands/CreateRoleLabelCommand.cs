using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.RoleLabels.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.RoleLabels.Commands;

public record CreateRoleLabelCommand(Guid CompanyId, string Name, string? NameEn = null, string? NameId = null) : IRequest<RoleLabelDto>;

public class CreateRoleLabelValidator : AbstractValidator<CreateRoleLabelCommand>
{
    public CreateRoleLabelValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(100).When(x => x.NameId is not null);
    }
}

public class CreateRoleLabelHandler(IApplicationDbContext db, ICurrentUser currentUser, IPermissionService permService, IAuditLogService auditLog)
    : IRequestHandler<CreateRoleLabelCommand, RoleLabelDto>
{
    public async Task<RoleLabelDto> Handle(CreateRoleLabelCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "company:manage-departments", ct);

        if (!currentUser.CanManageCompany(request.CompanyId))
            throw new AppForbiddenException("COMPANY_MANAGE_FORBIDDEN", "You are not allowed to manage this company.");

        if (await db.RoleLabels.AnyAsync(r => r.CompanyId == request.CompanyId && r.Name == request.Name, ct))
            throw new ConflictException("DUPLICATE_ROLE_LABEL", $"Job title '{request.Name}' already exists in this company.");

        var entity = new RoleLabel
        {
            CompanyId = request.CompanyId,
            Name      = request.Name,
            NameEn    = Common.Helpers.NameText.Normalize(request.NameEn),
            NameId    = Common.Helpers.NameText.Normalize(request.NameId),
            IsActive  = true,
            CreatedAt = DateTime.UtcNow.AddHours(7),
            UpdatedAt = DateTime.UtcNow.AddHours(7),
        };
        db.RoleLabels.Add(entity);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "role-label",
            entityType:  "RoleLabel",
            entityId:    entity.Id.ToString(),
            action:      "create",
            description: $"สร้างตำแหน่งงาน '{entity.Name}' ใน company {entity.CompanyId}",
            oldValues:   null,
            newValues:   new { entity.Name, entity.CompanyId },
            ct:          ct);

        return new RoleLabelDto(entity.Id, entity.CompanyId, entity.Name, entity.IsActive, entity.NameEn, entity.NameId);
    }
}
