using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Extensions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Employees.SetPassword;

public class SetPasswordHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPasswordService passwordService) : IRequestHandler<SetPasswordCommand>
{
    public async Task Handle(SetPasswordCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAdminOrHr())
            throw new AppForbiddenException("เฉพาะ Admin หรือ HR เท่านั้นที่ตั้งรหัสผ่านได้");

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        employee.PasswordHash = passwordService.Hash(request.NewPassword);
        employee.UpdatedAt    = DateTime.UtcNow;
        employee.UpdatedBy    = currentUser.EmployeeId;

        await db.SaveChangesAsync(ct);
    }
}
