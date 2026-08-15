using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExpenseBillingBatchItemConfiguration : IEntityTypeConfiguration<ExpenseBillingBatchItem>
{
    public void Configure(EntityTypeBuilder<ExpenseBillingBatchItem> builder)
    {
        builder.ToTable("expense_billing_batch_items");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.BatchId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.ExpenseClaimId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.AmountSnapshot).HasColumnType("decimal(12,2)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.BatchId);
        builder.HasIndex(x => x.ExpenseClaimId);

        builder.HasOne(x => x.Batch)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.BatchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ExpenseClaim)
            .WithMany()
            .HasForeignKey(x => x.ExpenseClaimId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
