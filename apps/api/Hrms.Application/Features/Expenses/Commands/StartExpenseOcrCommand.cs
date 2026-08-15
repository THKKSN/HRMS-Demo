using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Commands;

public record StartExpenseOcrCommand(Guid Id) : IRequest<ExpenseOcrStartDto>;

public class StartExpenseOcrHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IExpenseOcrQueue ocrQueue,
    IAuditLogService auditLog) : IRequestHandler<StartExpenseOcrCommand, ExpenseOcrStartDto>
{
    public async Task<ExpenseOcrStartDto> Handle(StartExpenseOcrCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (!await permService.HasPermissionAsync(currentUser, "expense:ocr", ct))
            throw new AppForbiddenException("ไม่มีสิทธิ์: expense:ocr");

        var claim = await db.ExpenseClaims
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบรายการสร้างบิล");

        var canViewAll = await permService.HasPermissionAsync(currentUser, "expense:view-all", ct);
        if (claim.EmployeeId != employeeId && !canViewAll)
            throw new AppForbiddenException("ไม่มีสิทธิ์ทำ OCR รายการนี้");

        if (claim.EmployeeId == employeeId && claim.Status != ExpenseClaimStatus.Draft)
            throw new ConflictException("EXPENSE_NOT_DRAFT", "พนักงานทำ OCR ได้เฉพาะรายการแบบร่างเท่านั้น");

        var attachmentFiles = ExpenseClaimMapper.ParseFiles(claim.AttachmentUrlsJson)
            .Where(x => x.DocumentType is ExpenseAttachmentDocumentType.PaymentOrder or ExpenseAttachmentDocumentType.Receipt)
            .ToList();
        if (attachmentFiles.Count == 0)
            throw new ConflictException("NO_OCR_ATTACHMENTS", "ต้องมีใบสั่งจ่ายหรือใบเสร็จชำระเงินก่อนทำ OCR");

        var urls = attachmentFiles.Select(x => x.Url).ToList();
        var activeResults = await db.ExpenseOcrResults
            .Where(x => x.ExpenseClaimId == claim.Id &&
                urls.Contains(x.AttachmentUrl) &&
                (x.Status == ExpenseOcrStatus.Pending || x.Status == ExpenseOcrStatus.Processing))
            .ToListAsync(ct);

        var activeUrls = activeResults
            .Select(x => x.AttachmentUrl)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var createdResults = new List<ExpenseOcrResult>();

        foreach (var file in attachmentFiles.Where(x => !activeUrls.Contains(x.Url)))
        {
            var result = new ExpenseOcrResult
            {
                ExpenseClaimId = claim.Id,
                AttachmentUrl = file.Url,
                DocumentType = file.DocumentType,
                Provider = "PaddleOCR",
                Status = ExpenseOcrStatus.Pending,
                CreatedBy = employeeId,
                UpdatedBy = employeeId
            };
            db.ExpenseOcrResults.Add(result);
            createdResults.Add(result);
        }

        if (createdResults.Count > 0)
            await db.SaveChangesAsync(ct);

        foreach (var result in createdResults)
            ocrQueue.Enqueue(result.Id);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: "ocr-enqueue",
            description: $"เริ่ม OCR รายการวางบิล {claim.Id}",
            oldValues: null,
            newValues: new { claim.Id, ResultCount = createdResults.Count, ActiveCount = activeResults.Count },
            ct: ct);

        var latestResults = activeResults.Concat(createdResults)
            .OrderBy(x => x.DocumentType)
            .ThenBy(x => x.CreatedAt)
            .Select(ExpenseOcrMapper.ToDto)
            .ToList();
        return new ExpenseOcrStartDto(claim.Id, latestResults);
    }
}
