using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExpenseBillingBatchConfiguration : IEntityTypeConfiguration<ExpenseBillingBatch>
{
    public void Configure(EntityTypeBuilder<ExpenseBillingBatch> builder)
    {
        builder.ToTable("expense_billing_batches");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.BatchNo).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.TotalAmount).HasColumnType("decimal(12,2)");
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CreatedByEmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.ExportedAt).HasColumnType("datetime");
        builder.Property(x => x.PaidAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.BatchNo).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => new { x.PeriodFrom, x.PeriodTo });

        builder.HasOne(x => x.CreatedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.CreatedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
