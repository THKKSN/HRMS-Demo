using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalReporterPhoneCountry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "phone_country",
                table: "external_reporters",
                type: "char(2)",
                maxLength: 2,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // Backfill เบอร์เดิมให้เป็น E.164 (ดู docs/external-reporter-phone-e164-plan.md ข้อ 4)
            // แยกเป็น 3 ก้อนตามรูปแบบที่พบได้ และไม่แตะเบอร์ที่ไม่เข้าเกณฑ์ใด — ปล่อยให้ผู้แจ้งแก้เองครั้งถัดไป

            // 1) เบอร์ไทยรูปแบบเดิม (0 นำหน้า รวม 9-10 หลัก) → +66 แล้วตัด 0 นำหน้าออก
            migrationBuilder.Sql("""
                UPDATE external_reporters
                SET phone = CONCAT('+66', SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', ''), 2)),
                    phone_country = 'TH'
                WHERE phone IS NOT NULL
                  AND phone NOT LIKE '+%'
                  AND REGEXP_REPLACE(phone, '[^0-9]', '') REGEXP '^0[0-9]{8,9}$';
                """);

            // 2) เบอร์ที่เป็น +66 อยู่แล้ว → ล้างเว้นวรรค/ขีดให้เหลือ E.164 ล้วน และรู้ประเทศแน่นอน
            migrationBuilder.Sql("""
                UPDATE external_reporters
                SET phone = CONCAT('+', REGEXP_REPLACE(phone, '[^0-9]', '')),
                    phone_country = 'TH'
                WHERE phone LIKE '+66%';
                """);

            // 3) เบอร์สากลอื่น ๆ → ล้างอักขระคั่นอย่างเดียว ประเทศเดาไม่ได้ (+1 มีหลายประเทศ) จึงคงเป็น NULL
            migrationBuilder.Sql("""
                UPDATE external_reporters
                SET phone = CONCAT('+', REGEXP_REPLACE(phone, '[^0-9]', ''))
                WHERE phone LIKE '+%'
                  AND phone_country IS NULL;
                """);
        }

        /// <inheritdoc />
        /// <remarks>
        /// ลบเฉพาะคอลัมน์ ไม่แปลงเบอร์กลับเป็นรูปแบบเดิม — E.164 ยังผ่าน validator ชุดเก่า
        /// (ซึ่งยอมรับ + และตัวเลข) จึงย้อนกลับได้โดยไม่ต้องแตะข้อมูล
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "phone_country",
                table: "external_reporters");
        }
    }
}
