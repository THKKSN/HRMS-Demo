using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Holidays.Commands;

/// <param name="CompanyId">null = วันหยุดแห่งชาติ</param>
public record CreateHolidayCommand(
    Guid? CompanyId,
    string Name,
    DateOnly Date) : IRequest<HolidayDto>;

public class CreateHolidayCommandValidator : AbstractValidator<CreateHolidayCommand>
{
    public CreateHolidayCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Date).NotEmpty();
    }
}

public class CreateHolidayHandler(IApplicationDbContext db, IScopeGuard scope, IAuditLogService auditLog)
    : IRequestHandler<CreateHolidayCommand, HolidayDto>
{
    public async Task<HolidayDto> Handle(CreateHolidayCommand request, CancellationToken ct)
    {
        if (request.CompanyId.HasValue)
        {
            await scope.ThrowIfCannotAccessAsync(request.CompanyId.Value, ct);

            var companyExists = await db.Companies.AnyAsync(c => c.Id == request.CompanyId.Value && c.IsActive, ct);
            if (!companyExists)
                throw new NotFoundException("Company", request.CompanyId!, "COMPANY_NOT_FOUND");
        }

        var duplicate = await db.Holidays.AnyAsync(
            h => h.Date == request.Date
              && h.CompanyId == request.CompanyId
              && h.IsActive, ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_HOLIDAY", $"A holiday on {request.Date:yyyy-MM-dd} already exists in this scope.");

        var holiday = new Holiday
        {
            CompanyId = request.CompanyId,
            Name      = request.Name,
            Date      = request.Date,
        };

        db.Holidays.Add(holiday);
        await db.SaveChangesAsync(ct);

        if (holiday.CompanyId.HasValue)
            holiday.Company = await db.Companies
                .FirstOrDefaultAsync(c => c.Id == holiday.CompanyId.Value, ct);

        await auditLog.LogAsync(
            module:      "holiday",
            entityType:  "Holiday",
            entityId:    holiday.Id.ToString(),
            action:      "create",
            description: $"สร้างวันหยุด '{holiday.Name}' วันที่ {holiday.Date:yyyy-MM-dd}",
            oldValues:   null,
            newValues:   new { holiday.Name, holiday.Date, holiday.CompanyId },
            ct:          ct);

        return ToDto(holiday);
    }

    internal static HolidayDto ToDto(Holiday h) => new(
        h.Id,
        h.CompanyId,
        h.Company?.Name,
        h.Name,
        h.Date,
        h.IsActive);
}
