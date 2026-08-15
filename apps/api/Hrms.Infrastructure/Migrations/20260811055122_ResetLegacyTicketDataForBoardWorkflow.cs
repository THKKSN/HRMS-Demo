using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ResetLegacyTicketDataForBoardWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM notification_outboxes
                WHERE entity_type = 'ticket';

                DELETE FROM ticket_status_history;
                DELETE FROM ticket_comments;
                DELETE FROM ticket_reviews;
                DELETE FROM ticket_cancellation_requests;
                DELETE FROM ticket_assignments;
                DELETE FROM ticket_attachments;
                DELETE FROM ticket_pending_uploads;
                DELETE FROM tickets;
                DELETE FROM ticket_daily_sequences;

                UPDATE ticket_subject_guidance_configs
                SET workflow_definition_id = NULL;

                DELETE FROM ticket_workflow_definitions;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentional no-op. This migration deletes legacy ticket data
            // to allow a clean break into the new board workflow model.
        }
    }
}
