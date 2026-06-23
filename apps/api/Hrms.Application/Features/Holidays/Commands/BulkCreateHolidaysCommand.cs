using FluentValidation;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Holidays.Dtos;
using Hrms.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Holidays.Commands;

public record BulkCreateHolidaysCommand(List<BulkHolidayItem> Holidays) : IRequest<BulkCreateHolidaysResult>;

public class BulkCreateHolidaysValidator : AbstractValidator<BulkCreateHolidaysCommand>
{
    public BulkCreateHolidaysValidator()
    {
        RuleFor(x => x.Holidays).NotEmpty();
        RuleForEach(x => x.Holidays).ChildRules(h =>
        {
            h.RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            h.RuleFor(x => x.Date).NotEmpty();
        });
    }
}

public class BulkCreateHolidaysHandler(IApplicationDbContext db, IScopeGuard scope)
    : IRequestHandler<BulkCreateHolidaysCommand, BulkCreateHolidaysResult>
{
    public async Task<BulkCreateHolidaysResult> Handle(BulkCreateHolidaysCommand request, CancellationToken ct)
    {
        // ตรวจ access สำหรับทุก companyId ที่ระบุ
        var companyIds = request.Holidays
            .Where(h => h.CompanyId.HasValue)
            .Select(h => h.CompanyId!.Value)
            .Distinct()
            .ToList();

        foreach (var companyId in companyIds)
            await scope.ThrowIfCannotAccessAsync(companyId, ct);

        // ดึง existing holidays ในช่วงวันที่ครอบคลุม
        var minDate = request.Holidays.Min(h => h.Date);
        var maxDate = request.Holidays.Max(h => h.Date);

        var existingKeys = await db.Holidays
            .Where(h => h.Date >= minDate && h.Date <= maxDate && h.IsActive)
            .Select(h => new { h.Date, h.CompanyId })
            .ToListAsync(ct);

        var existingSet = existingKeys
            .Select(h => (h.Date, h.CompanyId))
            .ToHashSet();

        int created = 0, skipped = 0;

        foreach (var item in request.Holidays)
        {
            if (existingSet.Contains((item.Date, item.CompanyId)))
            {
                skipped++;
                continue;
            }

            db.Holidays.Add(new Holiday
            {
                CompanyId = item.CompanyId,
                Name      = item.Name,
                Date      = item.Date,
            });

            // ป้องกัน duplicate ภายใน batch เดียวกัน
            existingSet.Add((item.Date, item.CompanyId));
            created++;
        }

        if (created > 0)
            await db.SaveChangesAsync(ct);

        return new BulkCreateHolidaysResult(created, skipped);
    }
}
