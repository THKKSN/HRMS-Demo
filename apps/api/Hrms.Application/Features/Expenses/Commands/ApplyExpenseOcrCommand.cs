using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Expenses.Commands;

public record ApplyExpenseOcrCommand(Guid Id, ApplyExpenseOcrRequest Request) : IRequest<ExpenseClaimDto>;

public class ApplyExpenseOcrHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permService,
    IAuditLogService auditLog) : IRequestHandler<ApplyExpenseOcrCommand, ExpenseClaimDto>
{
    public async Task<ExpenseClaimDto> Handle(ApplyExpenseOcrCommand request, CancellationToken ct)
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
            throw new AppForbiddenException("ไม่มีสิทธิ์แก้ไขรายการนี้");
        if (claim.Status != ExpenseClaimStatus.Draft)
            throw new ConflictException("EXPENSE_NOT_DRAFT", "ใช้ผล OCR เติมข้อมูลได้เฉพาะรายการแบบร่างเท่านั้น");

        var data = request.Request;
        if (data.ExpenseDate.HasValue) claim.ExpenseDate = data.ExpenseDate.Value;
        if (data.Amount.HasValue) claim.Amount = data.Amount.Value;
        if (data.FuelLiters.HasValue) claim.FuelLiters = data.FuelLiters.Value;
        if (data.TripCount.HasValue) claim.TripCount = data.TripCount.Value;
        if (data.MerchantName is not null) claim.MerchantName = TrimToNull(data.MerchantName);
        if (data.BillNo is not null) claim.BillNo = TrimToNull(data.BillNo);
        if (data.ReceiptTid is not null) claim.ReceiptTid = TrimToNull(data.ReceiptTid);
        if (data.ReceiptBatch is not null) claim.ReceiptBatch = TrimToNull(data.ReceiptBatch);
        if (data.ReceiptMid is not null) claim.ReceiptMid = TrimToNull(data.ReceiptMid);
        if (data.ReceiptTrace is not null) claim.ReceiptTrace = TrimToNull(data.ReceiptTrace);
        if (data.DriverName is not null) claim.DriverName = TrimToNull(data.DriverName);
        if (data.VehicleNo is not null) claim.VehicleNo = TrimToNull(data.VehicleNo);
        if (data.PlateNo is not null) claim.PlateNo = TrimToNull(data.PlateNo);
        if (data.TransportNo is not null) claim.TransportNo = TrimToNull(data.TransportNo);
        if (data.Origin is not null) claim.Origin = TrimToNull(data.Origin);
        if (data.CustomerName is not null) claim.CustomerName = TrimToNull(data.CustomerName);
        claim.UpdatedBy = employeeId;

        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync(
            module: "expense",
            entityType: "ExpenseClaim",
            entityId: claim.Id.ToString(),
            action: "ocr-apply",
            description: $"นำผล OCR ไปเติมร่างรายการวางบิล {claim.Id}",
            oldValues: null,
            newValues: data,
            ct: ct);

        return ExpenseClaimMapper.ToDto(claim);
    }

    private static string? TrimToNull(string value)
    {
        var trimmed = value.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
