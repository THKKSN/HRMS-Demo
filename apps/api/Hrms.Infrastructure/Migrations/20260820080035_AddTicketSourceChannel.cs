using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketSourceChannel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "source_channel",
                table: "tickets",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Unknown")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "source_client_app",
                table: "tickets",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_source_channel_created_at",
                table: "tickets",
                columns: new[] { "source_channel", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tickets_source_channel_created_at",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "source_channel",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "source_client_app",
                table: "tickets");
        }
    }
}
