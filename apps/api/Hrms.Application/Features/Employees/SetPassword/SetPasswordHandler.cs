using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.SetPassword;

public class SetPasswordHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPasswordService passwordService,
    IPermissionService permService) : IRequestHandler<SetPasswordCommand>
{
    public async Task Handle(SetPasswordCommand request, CancellationToken ct)
    {
        await currentUser.ThrowIfNoPermissionAsync(permService, "employee:reset-password", ct);

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        employee.PasswordHash = passwordService.Hash(request.NewPassword);
        employee.UpdatedAt    = DateTime.UtcNow.AddHours(7);
        employee.UpdatedBy    = currentUser.EmployeeId;

        await db.SaveChangesAsync(ct);
    }
}
