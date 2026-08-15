using FluentValidation;
using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Commands;

public record CreateExpenseClaimCommand(
    ExpenseClaimType Type,
    DateOnly ExpenseDate,
    decimal Amount,
    string? MerchantName,
    string? BillNo,
    string? ReceiptTid,
    string? ReceiptBatch,
    string? ReceiptMid,
    string? ReceiptTrace,
    string? DriverName,
    string? VehicleNo,
    string? PlateNo,
    decimal? FuelLiters,
    string? TransportNo,
    string? Origin,
    string? CustomerName,
    int? TripCount,
    string? Note,
    IReadOnlyList<string>? AttachmentUrls,
    IReadOnlyList<ExpenseAttachmentFileDto>? AttachmentFiles,
    bool SaveAsDraft = false) : IRequest<ExpenseClaimDto>;

public class CreateExpenseClaimValidator : AbstractValidator<CreateExpenseClaimCommand>
{
    public CreateExpenseClaimValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.ExpenseDate).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0).When(x => !x.SaveAsDraft);
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0).When(x => x.SaveAsDraft);
        RuleFor(x => x.MerchantName).MaximumLength(200);
        RuleFor(x => x.BillNo).MaximumLength(80);
        RuleFor(x => x.ReceiptTid).MaximumLength(80);
        RuleFor(x => x.ReceiptBatch).MaximumLength(80);
        RuleFor(x => x.ReceiptMid).MaximumLength(80);
        RuleFor(x => x.ReceiptTrace).MaximumLength(80);
        RuleFor(x => x.DriverName).MaximumLength(160);
        RuleFor(x => x.VehicleNo).MaximumLength(80);
        RuleFor(x => x.PlateNo).MaximumLength(80);
        RuleFor(x => x.FuelLiters).GreaterThan(0).When(x => x.FuelLiters.HasValue);
        RuleFor(x => x.TransportNo).MaximumLength(100);
        RuleFor(x => x.Origin).MaximumLength(200);
        RuleFor(x => x.CustomerName).MaximumLength(200);
        RuleFor(x => x.TripCount).GreaterThan(0).When(x => x.TripCount.HasValue);
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x)
            .Must(x => ExpenseClaimMapper.NormalizeFiles(x.AttachmentFiles, x.AttachmentUrls).Count > 0)
            .WithMessage("กรุณาแนบหลักฐานอย่างน้อย 1 ไฟล์")
            .When(x => !x.SaveAsDraft);
        RuleFor(x => x)
            .Must(x => ExpenseClaimMapper.NormalizeFiles(x.AttachmentFiles, x.AttachmentUrls).Count <= 5)
            .WithMessage("แนบหลักฐานได้สูงสุด 5 ไฟล์");
        RuleFor(x => x)
            .Must(HasRequiredFuelDocuments)
            .WithMessage("ค่าน้ำมันต้องแนบใบสั่งจ่ายและใบเสร็จชำระเงิน")
            .When(x => !x.SaveAsDraft && x.Type == ExpenseClaimType.Fuel);
        RuleForEach(x => x.AttachmentUrls)
            .NotEmpty()
            .MaximumLength(500);
        RuleForEach(x => x.AttachmentFiles).ChildRules(file =>
        {
            file.RuleFor(x => x.Url).NotEmpty().MaximumLength(500);
            file.RuleFor(x => x.DocumentType).IsInEnum();
            file.RuleFor(x => x.FileName).MaximumLength(255);
            file.RuleFor(x => x.ContentType).MaximumLength(100);
            file.RuleFor(x => x.SizeBytes).GreaterThan(0).When(x => x.SizeBytes.HasValue);
        });
    }

    private static bool HasRequiredFuelDocuments(CreateExpenseClaimCommand request)
    {
        var files = ExpenseClaimMapper.NormalizeFiles(request.AttachmentFiles, request.AttachmentUrls);
        return files.Any(file => file.DocumentType == ExpenseAttachmentDocumentType.PaymentOrder)
            && files.Any(file => file.DocumentType == ExpenseAttachmentDocumentType.Receipt);
    }
}

public class CreateExpenseClaimHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<CreateExpenseClaimCommand, ExpenseClaimDto>
{
    public async Task<ExpenseClaimDto> Handle(CreateExpenseClaimCommand request, CancellationToken ct)
    {
        var employeeId = currentUser.EmployeeId
            ?? throw new AppUnauthorizedException("UNAUTHENTICATED");
        if (!await permService.HasPermissionAsync(currentUser, "expense:create", ct))
            throw new AppForbiddenException("ไม่มีสิทธิ์: expense:create");

        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.IsActive, ct)
            ?? throw new AppUnauthorizedException("EMPLOYEE_NOT_FOUND");

        var attachmentFiles = ExpenseClaimMapper.ApplySubmittedFuelFileNames(
            request.Type,
            request.BillNo,
            request.SaveAsDraft,
            ExpenseClaimMapper.NormalizeFiles(request.AttachmentFiles, request.AttachmentUrls));

        var claim = new ExpenseClaim
        {
            EmployeeId = employee.Id,
            Type = request.Type,
            Status = request.SaveAsDraft ? ExpenseClaimStatus.Draft : ExpenseClaimStatus.Pending,
            ExpenseDate = request.ExpenseDate,
            Amount = request.Amount,
            MerchantName = request.MerchantName,
            BillNo = request.BillNo,
            ReceiptTid = request.ReceiptTid,
            ReceiptBatch = request.ReceiptBatch,
            ReceiptMid = request.ReceiptMid,
            ReceiptTrace = request.ReceiptTrace,
            DriverName = request.DriverName,
            VehicleNo = request.VehicleNo,
            PlateNo = request.PlateNo,
            FuelLiters = request.FuelLiters,
            TransportNo = request.TransportNo,
            Origin = request.Origin,
            CustomerName = request.CustomerName,
            TripCount = request.TripCount,
            Note = request.Note,
            AttachmentUrlsJson = ExpenseClaimMapper.SerializeFiles(attachmentFiles),
            CreatedBy = employee.Id,
            UpdatedBy = employee.Id
        };

        db.ExpenseClaims.Add(claim);
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: request.SaveAsDraft ? "create-draft" : "submit",
            description: request.SaveAsDraft
                ? $"{employee.FirstName} {employee.LastName} บันทึกร่างรายการสร้างบิล {claim.Type} วันที่ {claim.ExpenseDate:yyyy-MM-dd}"
                : $"{employee.FirstName} {employee.LastName} ส่งรายการสร้างบิล {claim.Type} วันที่ {claim.ExpenseDate:yyyy-MM-dd} จำนวน {claim.Amount:n2}",
            oldValues: null,
            newValues: new { claim.Type, claim.Status, claim.ExpenseDate, claim.Amount, claim.BillNo, claim.ReceiptTid, claim.ReceiptBatch, claim.ReceiptMid, claim.ReceiptTrace, claim.VehicleNo, claim.PlateNo, AttachmentCount = attachmentFiles.Count },
            ct: ct);

        claim.Employee = employee;
        return ExpenseClaimMapper.ToDto(claim);
    }
}
