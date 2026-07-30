using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Dashboard.Queries.GetAccessibleCompanies;

public class GetAccessibleCompaniesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IScopeGuard scopeGuard)
    : IRequestHandler<GetAccessibleCompaniesQuery, IReadOnlyList<AccessibleCompanyItem>>
{
    public async Task<IReadOnlyList<AccessibleCompanyItem>> Handle(
        GetAccessibleCompaniesQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new AppUnauthorizedException("UNAUTHENTICATED");

        var accessibleIds = await scopeGuard.GetAccessibleCompanyIdsAsync(ct);
        var isSystemWide  = accessibleIds is null;

        var companies = await db.Companies
            .Where(c => c.IsActive && (isSystemWide || accessibleIds!.Contains(c.Id)))
            .Select(c => new { c.Id, c.Name, c.ParentId, c.IsHeadquarters })
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        // สร้าง level จาก parent hierarchy
        var parentMap = companies.ToDictionary(c => c.Id, c => c.ParentId);

        int GetLevel(Guid id)
        {
            int level = 0;
            var current = id;
            while (parentMap.TryGetValue(current, out var parentId) && parentId.HasValue)
            {
                level++;
                current = parentId.Value;
            }
            return level;
        }

        // เรียง: parent ก่อน children (BFS)
        var ordered = new List<AccessibleCompanyItem>();
        var roots   = companies.Where(c => c.ParentId == null || !parentMap.ContainsKey(c.ParentId.Value)).ToList();
        var queue   = new Queue<Guid>(roots.Select(c => c.Id));
        var visited = new HashSet<Guid>();

        while (queue.Count > 0)
        {
            var id = queue.Dequeue();
            if (!visited.Add(id)) continue;

            var c = companies.FirstOrDefault(x => x.Id == id);
            if (c is null) continue;

            ordered.Add(new AccessibleCompanyItem(c.Id, c.Name, c.ParentId, c.IsHeadquarters, GetLevel(c.Id)));

            foreach (var child in companies.Where(x => x.ParentId == id))
                queue.Enqueue(child.Id);
        }

        return ordered;
    }
}
