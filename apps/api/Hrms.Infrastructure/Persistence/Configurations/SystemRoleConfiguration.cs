using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class SystemRoleConfiguration : IEntityTypeConfiguration<SystemRole>
{
    public void Configure(EntityTypeBuilder<SystemRole> builder)
    {
        builder.ToTable("roles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.Code).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(x => x.NameTh).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IsSystem).HasColumnType("tinyint(1)");
        builder.Property(x => x.IsActive).HasColumnType("tinyint(1)");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => x.Code)
            .IsUnique()
            .HasDatabaseName("ix_roles_code");
    }
}
