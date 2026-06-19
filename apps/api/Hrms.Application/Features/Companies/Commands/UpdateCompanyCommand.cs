using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Companies.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Companies.Commands;

public record UpdateCompanyCommand(
    Guid Id,
    string Name,
    string? NameEn,
    Guid? ParentId,
    bool IsActive) : IRequest<CompanyDto>;

public class UpdateCompanyValidator : AbstractValidator<UpdateCompanyCommand>
{
    public UpdateCompanyValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).When(x => x.NameEn is not null);
    }
}

public class UpdateCompanyHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateCompanyCommand, CompanyDto>
{
    public async Task<CompanyDto> Handle(UpdateCompanyCommand request, CancellationToken ct)
    {
        if (!currentUser.HasRole(RoleType.Admin))
            throw new AppForbiddenException("เฉพาะ Admin เท่านั้นที่สามารถแก้ไขบริษัทได้");

        var company = await db.Companies
            .FirstOrDefaultAsync(c => c.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบข้อมูลบริษัท");

        if (request.ParentId.HasValue && request.ParentId.Value == company.Id)
            throw new ConflictException("CIRCULAR_PARENT", "ไม่สามารถตั้งบริษัทตัวเองเป็นบริษัทแม่ได้");

        if (!request.IsActive)
        {
            var hasActiveChildren = await db.Companies
                .AnyAsync(c => c.ParentId == company.Id && c.IsActive, ct);

            if (hasActiveChildren)
                throw new ConflictException("HAS_ACTIVE_CHILDREN", "ไม่สามารถปิดบริษัทที่ยังมีบริษัทลูกที่ใช้งานอยู่");
        }

        string? parentName = null;
        if (request.ParentId.HasValue)
        {
            var parent = await db.Companies.FirstOrDefaultAsync(c => c.Id == request.ParentId.Value, ct)
                ?? throw new KeyNotFoundException("ไม่พบข้อมูลบริษัทแม่");

            if (!parent.IsActive)
                throw new ConflictException("PARENT_INACTIVE", "บริษัทแม่ถูกปิดใช้งานแล้ว");

            parentName = parent.Name;
        }

        company.Name      = request.Name;
        company.NameEn    = request.NameEn;
        company.ParentId  = request.ParentId;
        company.IsActive  = request.IsActive;
        company.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return new CompanyDto(
            company.Id,
            company.Name,
            company.NameEn,
            company.OrgType.ToString(),
            company.ParentId,
            parentName,
            company.IsActive);
    }
}
