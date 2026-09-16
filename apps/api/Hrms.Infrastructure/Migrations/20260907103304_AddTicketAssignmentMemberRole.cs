using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketAssignmentMemberRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "member_role",
                table: "ticket_assignments",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Owner")
                .Annotation("MySql:CharSet", "utf8mb4");

            // แถวเดิมทั้งหมดเป็นผู้รับผิดชอบหลัก (is_primary = 1) อยู่แล้ว — เขียนให้ครอบคลุมเผื่อมีแถวที่ไม่ใช่ primary
            migrationBuilder.Sql(@"
UPDATE ticket_assignments
SET member_role = CASE WHEN is_primary = 1 THEN 'Owner' ELSE 'Member' END;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "member_role",
                table: "ticket_assignments");
        }
    }
}
