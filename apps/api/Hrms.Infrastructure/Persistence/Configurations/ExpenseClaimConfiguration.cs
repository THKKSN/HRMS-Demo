using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExpenseClaimConfiguration : IEntityTypeConfiguration<ExpenseClaim>
{
    public void Configure(EntityTypeBuilder<ExpenseClaim> builder)
    {
        builder.ToTable("expense_claims");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.EmployeeId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Amount).HasColumnType("decimal(12,2)");
        builder.Property(x => x.MerchantName).HasMaxLength(200);
        builder.Property(x => x.BillNo).HasMaxLength(80);
        builder.Property(x => x.ReceiptTid).HasMaxLength(80);
        builder.Property(x => x.ReceiptBatch).HasMaxLength(80);
        builder.Property(x => x.ReceiptMid).HasMaxLength(80);
        builder.Property(x => x.ReceiptTrace).HasMaxLength(80);
        builder.Property(x => x.DriverName).HasMaxLength(160);
        builder.Property(x => x.VehicleNo).HasMaxLength(80);
        builder.Property(x => x.PlateNo).HasMaxLength(80);
        builder.Property(x => x.FuelLiters).HasColumnType("decimal(10,2)");
        builder.Property(x => x.TransportNo).HasMaxLength(100);
        builder.Property(x => x.Origin).HasMaxLength(200);
        builder.Property(x => x.CustomerName).HasMaxLength(200);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.AttachmentUrlsJson).HasColumnType("text");
        builder.Property(x => x.BillingBatchId).HasColumnType("char(36)");
        builder.Property(x => x.BatchedAt).HasColumnType("datetime");
        builder.Property(x => x.PaidAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.EmployeeId, x.Status });
        builder.HasIndex(x => new { x.ExpenseDate, x.Status });
        builder.HasIndex(x => x.BillNo);
        builder.HasIndex(x => x.ReceiptTrace);
        builder.HasIndex(x => x.BillingBatchId);

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.ExpenseClaims)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.BillingBatch)
            .WithMany(x => x.Claims)
            .HasForeignKey(x => x.BillingBatchId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
