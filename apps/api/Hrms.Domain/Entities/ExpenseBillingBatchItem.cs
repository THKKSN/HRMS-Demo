using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class ExpenseBillingBatchItem : BaseEntity
{
    public Guid BatchId { get; set; }
    public Guid ExpenseClaimId { get; set; }
    public decimal AmountSnapshot { get; set; }

    public ExpenseBillingBatch Batch { get; set; } = null!;
    public ExpenseClaim ExpenseClaim { get; set; } = null!;
}
