using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.ToggleEmployeeStatus;

public record ToggleEmployeeStatusCommand(Guid Id, bool IsActive) : IRequest;

public class ToggleEmployeeStatusHandler(IApplicationDbContext db, ICurrentUser currentUser, IScopeGuard scope)
    : IRequestHandler<ToggleEmployeeStatusCommand>
{
    public async Task Handle(ToggleEmployeeStatusCommand request, CancellationToken ct)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸™à¸±à¸à¸‡à¸²à¸™");

        await scope.ThrowIfCannotAccessAsync(employee.CompanyId);

        if (!request.IsActive && employee.Id == currentUser.EmployeeId)
            throw new ConflictException("CANNOT_DEACTIVATE_SELF", "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¸•à¸±à¸§à¹€à¸­à¸‡à¹„à¸”à¹‰");

        employee.IsActive  = request.IsActive;
        employee.UpdatedAt = DateTime.UtcNow;

        if (!request.IsActive)
        {
            // revoke refresh tokens à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹€à¸¡à¸·à¹ˆà¸­à¸›à¸´à¸”à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™
            var tokens = await db.RefreshTokens
                .Where(t => t.EmployeeId == request.Id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var token in tokens)
                token.RevokedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }
}

