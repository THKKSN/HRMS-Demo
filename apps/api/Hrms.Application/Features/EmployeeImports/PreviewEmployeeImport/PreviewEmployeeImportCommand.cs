using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Helpers;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.EmployeeImports.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.EmployeeImports.PreviewEmployeeImport;

public sealed record PreviewEmployeeImportCommand(string NationalId) : IRequest<EmployeeImportPreviewDto>;

public sealed class PreviewEmployeeImportValidator : AbstractValidator<PreviewEmployeeImportCommand>
{
    public PreviewEmployeeImportValidator() => RuleFor(x => x.NationalId).Matches("^[0-9]{13}$");
}

public sealed class PreviewEmployeeImportHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPiswinEmployeeClient piswinClient)
    : IRequestHandler<PreviewEmployeeImportCommand, EmployeeImportPreviewDto>
{
    public async Task<EmployeeImportPreviewDto> Handle(PreviewEmployeeImportCommand request, CancellationToken ct)
    {
        if (!currentUser.Roles.Any(role => role.Role == RoleType.Admin.ToString()))
            throw new AppForbiddenException("ไม่มีสิทธิ์นำเข้าพนักงาน");

        var employee = await piswinClient.FindByNationalIdAsync(request.NationalId, ct);

        // Piswin ส่งรหัสมาแบบไม่ pad — เทียบกับ canonical form ที่เก็บใน DB เสมอ
        var employeeCode = EmployeeCodeNormalizer.Normalize(employee.EmployeeCode);
        var alreadyImported = await db.Employees.AnyAsync(
            local => local.EmployeeCode == employeeCode, ct);

        return new EmployeeImportPreviewDto(
            employeeCode,
            employee.FirstName,
            employee.LastName,
            MaskNationalId(employee.NationalId),
            employee.HireDate,
            employee.IsActive,
            alreadyImported);
    }

    private static string MaskNationalId(string nationalId) =>
        nationalId.Length == 13
            ? $"{nationalId[0]}********{nationalId[^4..]}"
            : "********";
}
