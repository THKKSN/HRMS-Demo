using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Companies.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Companies.Commands;

public record UpdateCompanyCommand(
    Guid Id,
    string Name,
    string? NameEn,
    Guid? ParentId,
    bool IsActive,
    bool IsHeadquarters,
    string? NameId = null) : IRequest<CompanyDto>;

public class UpdateCompanyValidator : AbstractValidator<UpdateCompanyCommand>
{
    public UpdateCompanyValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
        RuleFor(x => x.NameId).MaximumLength(200).When(x => x.NameId is not null);
    }
}

public class UpdateCompanyHandler(IApplicationDbContext db, IScopeGuard scope, IAuditLogService auditLog)
    : IRequestHandler<UpdateCompanyCommand, CompanyDto>
{
    public async Task<CompanyDto> Handle(UpdateCompanyCommand request, CancellationToken ct)
    {
        await scope.ThrowIfCannotAccessAsync(request.Id, ct);

        var company = await db.Companies
            .FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new NotFoundException("Company", request.Id, "COMPANY_NOT_FOUND");

        if (request.ParentId.HasValue && request.ParentId.Value == company.Id)
            throw new ConflictException("CIRCULAR_PARENT", "A company cannot be its own parent.");

        if (!request.IsActive)
        {
            var hasActiveChildren = await db.Companies
                .AnyAsync(c => c.ParentId == company.Id && c.IsActive, ct);

            if (hasActiveChildren)
                throw new ConflictException("HAS_ACTIVE_CHILDREN", "A company with active child companies cannot be deactivated.");
        }

        string? parentName = null;
        if (request.ParentId.HasValue)
        {
            var parent = await db.Companies.FirstOrDefaultAsync(c => c.Id == request.ParentId.Value, ct)
                ?? throw new NotFoundException("Company", request.ParentId.Value, "PARENT_COMPANY_NOT_FOUND");

            if (!parent.IsActive)
                throw new ConflictException("PARENT_INACTIVE", "The parent company is inactive.");

            parentName = parent.Name;
        }

        var oldValues = new { company.Name, company.NameEn, company.ParentId, company.IsActive, company.IsHeadquarters };

        company.Name           = request.Name;
        company.NameEn         = request.NameEn;
        company.NameId         = Common.Helpers.NameText.Apply(company.NameId, request.NameId);
        company.ParentId       = request.ParentId;
        company.IsActive       = request.IsActive;
        company.IsHeadquarters = request.IsHeadquarters;
        company.UpdatedAt      = DateTime.UtcNow.AddHours(7);

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "company",
            entityType:  "Company",
            entityId:    company.Id.ToString(),
            action:      "update",
            description: $"แก้ไขข้อมูลบริษัท '{company.Name}'",
            oldValues:   oldValues,
            newValues:   new { company.Name, company.NameEn, company.ParentId, company.IsActive, company.IsHeadquarters },
            ct:          ct);

        return new CompanyDto(
            company.Id,
            company.Name,
            company.NameEn,
            company.OrgType.ToString(),
            company.ParentId,
            parentName,
            company.IsActive,
            company.IsHeadquarters,
            NameId: company.NameId);
    }
}
