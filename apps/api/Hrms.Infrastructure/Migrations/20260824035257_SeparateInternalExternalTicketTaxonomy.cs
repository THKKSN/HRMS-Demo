using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeparateInternalExternalTicketTaxonomy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_external_ticket_configurations_departments_target_department",
                table: "external_ticket_configurations");

            migrationBuilder.DropForeignKey(
                name: "fk_external_ticket_subjects_ticket_subjects_internal_ticket_sub",
                table: "external_ticket_subjects");

            migrationBuilder.DropIndex(
                name: "ix_external_ticket_subjects_internal_ticket_subject_id",
                table: "external_ticket_subjects");

            migrationBuilder.DropIndex(
                name: "ix_external_ticket_configurations_target_department_id",
                table: "external_ticket_configurations");

            migrationBuilder.DropColumn(
                name: "internal_ticket_subject_id",
                table: "external_ticket_subjects");

            migrationBuilder.DropColumn(
                name: "target_department_id",
                table: "external_ticket_configurations");

            migrationBuilder.AlterColumn<Guid>(
                name: "topic_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "category_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "external_ticket_category_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "external_ticket_subject_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "external_ticket_topic_id",
                table: "tickets",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_tickets_external_ticket_category_id_external_ticket_topic_id",
                table: "tickets",
                columns: new[] { "external_ticket_category_id", "external_ticket_topic_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_tickets_external_ticket_subject_id_status",
                table: "tickets",
                columns: new[] { "external_ticket_subject_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_tickets_external_ticket_topic_id",
                table: "tickets",
                column: "external_ticket_topic_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets",
                sql: "((request_type = 'Internal' AND category_id IS NOT NULL AND topic_id IS NOT NULL AND external_ticket_category_id IS NULL AND external_ticket_topic_id IS NULL AND external_ticket_subject_id IS NULL) OR (request_type = 'External' AND category_id IS NULL AND topic_id IS NULL AND subject_id IS NULL AND external_ticket_category_id IS NOT NULL AND external_ticket_topic_id IS NOT NULL))");

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_external_ticket_categories_external_ticket_category_",
                table: "tickets",
                column: "external_ticket_category_id",
                principalTable: "external_ticket_categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_external_ticket_subjects_external_ticket_subject_id",
                table: "tickets",
                column: "external_ticket_subject_id",
                principalTable: "external_ticket_subjects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_tickets_external_ticket_topics_external_ticket_topic_id",
                table: "tickets",
                column: "external_ticket_topic_id",
                principalTable: "external_ticket_topics",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tickets_external_ticket_categories_external_ticket_category_",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_external_ticket_subjects_external_ticket_subject_id",
                table: "tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_tickets_external_ticket_topics_external_ticket_topic_id",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_external_ticket_category_id_external_ticket_topic_id",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_external_ticket_subject_id_status",
                table: "tickets");

            migrationBuilder.DropIndex(
                name: "ix_tickets_external_ticket_topic_id",
                table: "tickets");

            migrationBuilder.DropCheckConstraint(
                name: "ck_tickets_taxonomy_by_request_type",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "external_ticket_category_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "external_ticket_subject_id",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "external_ticket_topic_id",
                table: "tickets");

            migrationBuilder.AlterColumn<Guid>(
                name: "topic_id",
                table: "tickets",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "category_id",
                table: "tickets",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "internal_ticket_subject_id",
                table: "external_ticket_subjects",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<Guid>(
                name: "target_department_id",
                table: "external_ticket_configurations",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_subjects_internal_ticket_subject_id",
                table: "external_ticket_subjects",
                column: "internal_ticket_subject_id");

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_configurations_target_department_id",
                table: "external_ticket_configurations",
                column: "target_department_id");

            migrationBuilder.AddForeignKey(
                name: "fk_external_ticket_configurations_departments_target_department",
                table: "external_ticket_configurations",
                column: "target_department_id",
                principalTable: "departments",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_external_ticket_subjects_ticket_subjects_internal_ticket_sub",
                table: "external_ticket_subjects",
                column: "internal_ticket_subject_id",
                principalTable: "ticket_subjects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
