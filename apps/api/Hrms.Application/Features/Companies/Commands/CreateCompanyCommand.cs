using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
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
    Guid? ParentId) : IRequest<CompanyDto>;

public class CreateCompanyValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
    }
}

public class CreateCompanyHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<CreateCompanyCommand, CompanyDto>
{
    public async Task<CompanyDto> Handle(CreateCompanyCommand request, CancellationToken ct)
    {
        if (!currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("เฉพาะ Admin เท่านั้นที่สามารถสร้างบริษัทได้");

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
            Name      = request.Name,
            NameEn    = request.NameEn,
            OrgType   = request.OrgType,
            ParentId  = request.ParentId,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);

        return new CompanyDto(
            company.Id,
            company.Name,
            company.NameEn,
            company.OrgType.ToString(),
            company.ParentId,
            parent?.Name,
            company.IsActive);
    }
}
