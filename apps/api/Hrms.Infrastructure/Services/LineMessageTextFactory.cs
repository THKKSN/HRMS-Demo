using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Localization;
using Hrms.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

/// <inheritdoc cref="ILineMessageTextFactory"/>
public sealed class LineMessageTextFactory(
    HrmsDbContext db,
    INotificationTemplateCatalog catalog) : ILineMessageTextFactory
{
    public MessageText For(string? preferredLanguage)
        => new(catalog, AppLocale.ForNotifications(preferredLanguage));

    public async Task<MessageText> ForLineUserAsync(string lineUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(lineUserId)) return For(null);

        var language = await db.Employees.AsNoTracking()
            .Where(x => x.LineUserId == lineUserId)
            .Select(x => x.PreferredLanguage)
            .FirstOrDefaultAsync(ct);

        // ไม่ใช่พนักงาน — อาจเป็นผู้แจ้งภายนอกที่ทักเข้ามาทางแชทเดียวกัน
        language ??= await db.ExternalReporters.AsNoTracking()
            .Where(x => x.LineUserId == lineUserId)
            .Select(x => x.PreferredLanguage)
            .FirstOrDefaultAsync(ct);

        return For(language);
    }
}
