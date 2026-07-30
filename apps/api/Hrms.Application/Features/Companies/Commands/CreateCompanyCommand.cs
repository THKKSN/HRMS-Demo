using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Companies.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Companies.Commands;

public record CreateCompanyCommand(
    string Name,
    string? NameEn,
    OrgType OrgType,
    Guid? ParentId,
    bool IsHeadquarters = false) : IRequest<CompanyDto>;

public class CreateCompanyValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
    }
}

public class CreateCompanyHandler(IApplicationDbContext db, IAuditLogService auditLog)
    : IRequestHandler<CreateCompanyCommand, CompanyDto>
{
    public async Task<CompanyDto> Handle(CreateCompanyCommand request, CancellationToken ct)
    {
        Company? parent = null;
        if (request.ParentId.HasValue)
        {
            parent = await db.Companies.FirstOrDefaultAsync(c => c.Id == request.ParentId.Value, ct)
                ?? throw new KeyNotFoundException("ไม่พบข้อมูลบริษัทแม่");

            if (!parent.IsActive)
                throw new ConflictException("PARENT_INACTIVE", "บริษัทแม่ถูกปิดใช้งานแล้ว");
        }

        var company = new Company
        {
            Name           = request.Name,
            NameEn         = request.NameEn,
            OrgType        = request.OrgType,
            ParentId       = request.ParentId,
            IsHeadquarters = request.IsHeadquarters,
            IsActive       = true,
            CreatedAt      = DateTime.UtcNow.AddHours(7),
            UpdatedAt      = DateTime.UtcNow.AddHours(7),
        };

        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module:      "company",
            entityType:  "Company",
            entityId:    company.Id.ToString(),
            action:      "create",
            description: $"สร้างบริษัท '{company.Name}'",
            oldValues:   null,
            newValues:   new { company.Name, company.NameEn, company.OrgType, company.ParentId, company.IsHeadquarters },
            ct:          ct);

        return new CompanyDto(
            company.Id,
            company.Name,
            company.NameEn,
            company.OrgType.ToString(),
            company.ParentId,
            parent?.Name,
            company.IsActive,
            company.IsHeadquarters);
    }
}
