using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMemoNoMonthlySequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "memo_no",
                table: "memos",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "memo_monthly_sequences",
                columns: table => new
                {
                    sequence_month = table.Column<string>(type: "char(6)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_number = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_memo_monthly_sequences", x => x.sequence_month);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // Backfill เรื่องเก่าที่ยังไม่มี memo_no — ตั้งเลขรันต่อรายเดือนตาม created_at
            migrationBuilder.Sql(
                """
                SET @seq := 0;
                SET @prev_month := '';
                UPDATE memos
                JOIN (
                    SELECT id,
                           DATE_FORMAT(created_at, '%Y%m') AS ym,
                           @seq := IF(@prev_month = DATE_FORMAT(created_at, '%Y%m'), @seq + 1, 1) AS seq_no,
                           @prev_month := DATE_FORMAT(created_at, '%Y%m') AS prev_month
                    FROM memos
                    ORDER BY DATE_FORMAT(created_at, '%Y%m'), created_at
                ) ranked ON ranked.id = memos.id
                SET memos.memo_no = CONCAT('Memo-', DATE_FORMAT(memos.created_at, '%Y%m%d'), '-', LPAD(ranked.seq_no, 4, '0'));
                """);

            migrationBuilder.Sql(
                """
                INSERT INTO memo_monthly_sequences (sequence_month, last_number)
                SELECT DATE_FORMAT(created_at, '%Y%m'), COUNT(*)
                FROM memos
                GROUP BY DATE_FORMAT(created_at, '%Y%m');
                """);

            migrationBuilder.CreateIndex(
                name: "ix_memos_memo_no",
                table: "memos",
                column: "memo_no",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "memo_monthly_sequences");

            migrationBuilder.DropIndex(
                name: "ix_memos_memo_no",
                table: "memos");

            migrationBuilder.DropColumn(
                name: "memo_no",
                table: "memos");
        }
    }
}
