using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("role_permissions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnType("char(36)");
        builder.Property(x => x.RoleId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.PermissionId).HasColumnType("char(36)").IsRequired();
        builder.Property(x => x.GrantedBy).HasColumnType("char(36)");
        builder.Property(x => x.GrantedAt).HasColumnType("datetime");
        builder.Property(x => x.CreatedAt).HasColumnType("datetime");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime");

        builder.HasIndex(x => new { x.RoleId, x.PermissionId })
               .IsUnique()
               .HasDatabaseName("ix_role_permissions_role_id_permission");

        builder.HasOne(x => x.Role)
               .WithMany(r => r.RolePermissions)
               .HasForeignKey(x => x.RoleId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Permission)
               .WithMany(p => p.RolePermissions)
               .HasForeignKey(x => x.PermissionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
