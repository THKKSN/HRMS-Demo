using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoReturnToRequester : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "returned_from_step_instance_id",
                table: "memos",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<DateTime>(
                name: "returned_to_requester_at",
                table: "memos",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "returned_to_requester_reason",
                table: "memos",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "returned_from_step_instance_id",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "returned_to_requester_at",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "returned_to_requester_reason",
                table: "memos");
        }
    }
}
