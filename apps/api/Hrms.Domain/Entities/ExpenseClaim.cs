using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class ExpenseClaim : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public ExpenseClaimType Type { get; set; } = ExpenseClaimType.Fuel;
    public ExpenseClaimStatus Status { get; set; } = ExpenseClaimStatus.Pending;
    public DateOnly ExpenseDate { get; set; }
    public decimal Amount { get; set; }
    public string? MerchantName { get; set; }
    public string? BillNo { get; set; }
    public string? ReceiptTid { get; set; }
    public string? ReceiptBatch { get; set; }
    public string? ReceiptMid { get; set; }
    public string? ReceiptTrace { get; set; }
    public string? DriverName { get; set; }
    public string? VehicleNo { get; set; }
    public string? PlateNo { get; set; }
    public decimal? FuelLiters { get; set; }
    public string? TransportNo { get; set; }
    public string? Origin { get; set; }
    public string? CustomerName { get; set; }
    public int? TripCount { get; set; }
    public string? Note { get; set; }
    public string? AttachmentUrlsJson { get; set; }
    public Guid? BillingBatchId { get; set; }
    public DateTime? BatchedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public Employee Employee { get; set; } = null!;
    public ExpenseBillingBatch? BillingBatch { get; set; }
    public ICollection<ExpenseOcrResult> OcrResults { get; set; } = [];
}
