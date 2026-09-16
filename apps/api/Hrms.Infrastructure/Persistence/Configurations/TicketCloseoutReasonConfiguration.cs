using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class TicketCloseoutReasonConfiguration : IEntityTypeConfiguration<TicketCloseoutReason>
{
    public void Configure(EntityTypeBuilder<TicketCloseoutReason> builder)
    {
        builder.ToTable("ticket_closeout_reasons");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CompanyId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.DepartmentId).HasColumnType("char(36)");
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.NameEn).HasMaxLength(100);
        builder.Property(x => x.NameId).HasMaxLength(100);
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.Property(x => x.Kind).HasMaxLength(30).IsRequired().HasDefaultValue(TicketCloseoutReason.ProblemTypeKind);
        builder.Property(x => x.LegacyProblemType).HasMaxLength(30);
        builder.Property(x => x.IsActive).HasDefaultValue(true);
        builder.Property(x => x.RequiresResolutionNote).HasDefaultValue(true);
        builder.Property(x => x.RequiresCompletionEvidence).HasDefaultValue(true);
        builder.Property(x => x.CreatedByEmployeeId).HasColumnType("char(36)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.CompanyId, x.DepartmentId, x.Kind, x.IsActive });
        builder.HasIndex(x => new { x.CompanyId, x.LegacyProblemType });

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.CreatedByEmployee)
            .WithMany()
            .HasForeignKey(x => x.CreatedByEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class TicketCloseoutReasonCategoryConfiguration : IEntityTypeConfiguration<TicketCloseoutReasonCategory>
{
    public void Configure(EntityTypeBuilder<TicketCloseoutReasonCategory> builder)
    {
        builder.ToTable("ticket_closeout_reason_categories");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.CloseoutReasonId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CategoryId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.CloseoutReasonId, x.CategoryId }).IsUnique();
        builder.HasIndex(x => x.CategoryId);

        builder.HasOne(x => x.CloseoutReason)
            .WithMany(x => x.Categories)
            .HasForeignKey(x => x.CloseoutReasonId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
