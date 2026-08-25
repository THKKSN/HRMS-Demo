using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalTicketTaxonomy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "external_ticket_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_external_ticket_categories", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "external_ticket_configurations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    target_company_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    target_department_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    is_enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    require_oa_friendship = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    privacy_notice_version = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    privacy_notice_url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_external_ticket_configurations", x => x.id);
                    table.ForeignKey(
                        name: "fk_external_ticket_configurations_companies_target_company_id",
                        column: x => x.target_company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_external_ticket_configurations_departments_target_department",
                        column: x => x.target_department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "external_ticket_topics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    external_ticket_category_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_external_ticket_topics", x => x.id);
                    table.ForeignKey(
                        name: "fk_external_ticket_topics_external_ticket_categories_external_t",
                        column: x => x.external_ticket_category_id,
                        principalTable: "external_ticket_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "external_ticket_subjects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    external_ticket_topic_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    internal_ticket_subject_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false),
                    created_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    updated_by = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_external_ticket_subjects", x => x.id);
                    table.ForeignKey(
                        name: "fk_external_ticket_subjects_external_ticket_topics_external_tic",
                        column: x => x.external_ticket_topic_id,
                        principalTable: "external_ticket_topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_external_ticket_subjects_ticket_subjects_internal_ticket_sub",
                        column: x => x.internal_ticket_subject_id,
                        principalTable: "ticket_subjects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_categories_is_active_sort_order",
                table: "external_ticket_categories",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_categories_name",
                table: "external_ticket_categories",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_configurations_target_company_id",
                table: "external_ticket_configurations",
                column: "target_company_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_configurations_target_department_id",
                table: "external_ticket_configurations",
                column: "target_department_id");

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_subjects_external_ticket_topic_id_is_active_",
                table: "external_ticket_subjects",
                columns: new[] { "external_ticket_topic_id", "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_subjects_external_ticket_topic_id_name",
                table: "external_ticket_subjects",
                columns: new[] { "external_ticket_topic_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_subjects_internal_ticket_subject_id",
                table: "external_ticket_subjects",
                column: "internal_ticket_subject_id");

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_topics_external_ticket_category_id_is_active",
                table: "external_ticket_topics",
                columns: new[] { "external_ticket_category_id", "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_external_ticket_topics_external_ticket_category_id_name",
                table: "external_ticket_topics",
                columns: new[] { "external_ticket_category_id", "name" },
                unique: true);

            // Seed แถวเดียวของ configuration แบบปิดใช้งาน — ยังไม่รู้ target department
            migrationBuilder.InsertData(
                table: "external_ticket_configurations",
                columns: new[] { "id", "target_company_id", "target_department_id", "is_enabled", "require_oa_friendship", "privacy_notice_version", "privacy_notice_url", "created_at", "updated_at", "created_by", "updated_by" },
                values: new object[] { new Guid("20000000-0000-0000-0000-000000000001"), new Guid("c89cb0d1-7548-4c1b-a36a-929f094f0b30"), null, false, false, null, null, new DateTime(2026, 8, 21, 0, 0, 0, DateTimeKind.Unspecified), new DateTime(2026, 8, 21, 0, 0, 0, DateTimeKind.Unspecified), null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "external_ticket_configurations");

            migrationBuilder.DropTable(
                name: "external_ticket_subjects");

            migrationBuilder.DropTable(
                name: "external_ticket_topics");

            migrationBuilder.DropTable(
                name: "external_ticket_categories");
        }
    }
}
