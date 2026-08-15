using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class ExpenseBillingBatch : BaseEntity
{
    public string BatchNo { get; set; } = string.Empty;
    public DateOnly PeriodFrom { get; set; }
    public DateOnly PeriodTo { get; set; }
    public ExpenseBillingBatchStatus Status { get; set; } = ExpenseBillingBatchStatus.Draft;
    public int TotalClaims { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Note { get; set; }
    public Guid CreatedByEmployeeId { get; set; }
    public DateTime? ExportedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public Employee CreatedByEmployee { get; set; } = null!;
    public ICollection<ExpenseBillingBatchItem> Items { get; set; } = new List<ExpenseBillingBatchItem>();
    public ICollection<ExpenseClaim> Claims { get; set; } = new List<ExpenseClaim>();
}
