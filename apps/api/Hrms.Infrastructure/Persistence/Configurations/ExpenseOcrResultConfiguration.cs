using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class ExpenseOcrResultConfiguration : IEntityTypeConfiguration<ExpenseOcrResult>
{
    public void Configure(EntityTypeBuilder<ExpenseOcrResult> builder)
    {
        builder.ToTable("expense_ocr_results");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.ExpenseClaimId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.AttachmentUrl).HasMaxLength(500).IsRequired();
        builder.Property(x => x.DocumentType).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(x => x.Provider).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(x => x.RawText).HasColumnType("longtext");
        builder.Property(x => x.RawLinesJson).HasColumnType("json");
        builder.Property(x => x.ParsedJson).HasColumnType("json");
        builder.Property(x => x.ConfidenceScore).HasColumnType("decimal(5,2)");
        builder.Property(x => x.DurationMs).HasColumnType("decimal(12,2)");
        builder.Property(x => x.Profile).HasMaxLength(30);
        builder.Property(x => x.MaxSide).HasColumnType("int");
        builder.Property(x => x.PreprocessVariant).HasMaxLength(60);
        builder.Property(x => x.AttemptCount).HasColumnType("int").HasDefaultValue(0);
        builder.Property(x => x.WorkerVersion).HasMaxLength(60);
        builder.Property(x => x.ModelVersion).HasMaxLength(120);
        builder.Property(x => x.ErrorMessage).HasMaxLength(500);
        builder.Property(x => x.ProcessingStartedAt).HasColumnType("datetime");
        builder.Property(x => x.ProcessedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedBy).HasColumnType("char(36)");
        builder.Property(x => x.UpdatedBy).HasColumnType("char(36)");

        builder.HasIndex(x => new { x.ExpenseClaimId, x.Status });
        builder.HasIndex(x => new { x.ExpenseClaimId, x.AttachmentUrl });

        builder.HasOne(x => x.ExpenseClaim)
            .WithMany(x => x.OcrResults)
            .HasForeignKey(x => x.ExpenseClaimId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
