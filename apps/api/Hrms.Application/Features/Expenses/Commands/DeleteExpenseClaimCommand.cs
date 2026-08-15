using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Commands;

public record DeleteExpenseClaimCommand(Guid Id) : IRequest;

public class DeleteExpenseClaimHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IFileStorageService fileStorage,
    IAuditLogService auditLog) : IRequestHandler<DeleteExpenseClaimCommand>
{
    public async Task Handle(DeleteExpenseClaimCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (!await permService.HasPermissionAsync(currentUser, "expense:update-draft", ct))
            throw new AppForbiddenException("ไม่มีสิทธิ์: expense:update-draft");

        var claim = await db.ExpenseClaims
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        if (claim.EmployeeId != employeeId)
            throw new AppForbiddenException("ไม่มีสิทธิ์ลบรายการนี้");

        if (claim.Status != ExpenseClaimStatus.Draft)
            throw new ConflictException("EXPENSE_NOT_DRAFT", "ลบได้เฉพาะรายการแบบร่างเท่านั้น");

        var attachmentFiles = ExpenseClaimMapper.ParseFiles(claim.AttachmentUrlsJson);
        var storageKeys = attachmentFiles
            .Select(file => TryGetUploadKey(file.Url))
            .Where(key => key is not null)
            .Select(key => key!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        db.ExpenseClaims.Remove(claim);
        await db.SaveChangesAsync(ct);

        foreach (var key in storageKeys)
            await fileStorage.DeleteAsync(key, ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: "delete-draft",
            description: $"ลบร่างรายการสร้างบิล {claim.Type} วันที่ {claim.ExpenseDate:yyyy-MM-dd}",
            oldValues: new
            {
                claim.Type,
                claim.Status,
                claim.ExpenseDate,
                claim.Amount,
                AttachmentCount = attachmentFiles.Count,
                DeletedFileCount = storageKeys.Count
            },
            newValues: null,
            ct: ct);
    }

    private static string? TryGetUploadKey(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        string path;
        if (Uri.TryCreate(url, UriKind.Absolute, out var absolute))
            path = absolute.AbsolutePath;
        else
            path = url;

        const string uploadsPrefix = "/uploads/";
        if (!path.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase))
            return null;

        var key = Uri.UnescapeDataString(path[uploadsPrefix.Length..]).TrimStart('/');
        return key.StartsWith("expenses/", StringComparison.OrdinalIgnoreCase)
            ? key
            : null;
    }
}
