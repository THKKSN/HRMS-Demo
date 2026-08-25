using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Features.ExternalTickets.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.ExternalTickets.Commands;

// ไม่มีเรื่อง privacy notice ในระบบแล้ว — consent จัดการที่ระดับ LINE ไปแล้ว (2026-08-24)
public record UpdateExternalTicketConfigurationCommand(
    bool RequireOaFriendship,
    bool IsEnabled,
    DateTime ExpectedUpdatedAt) : IRequest<ExternalTicketConfigurationDto>;

public class UpdateExternalTicketConfigurationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPermissionService permissionService,
    IAuditLogService auditLog)
    : IRequestHandler<UpdateExternalTicketConfigurationCommand, ExternalTicketConfigurationDto>
{
    public async Task<ExternalTicketConfigurationDto> Handle(UpdateExternalTicketConfigurationCommand request, CancellationToken ct)
    {
        await ExternalTicketConfigAccess.EnsureManagePermissionAsync(currentUser, permissionService, ct);

        var config = await ExternalTicketConfigAccess.LoadConfigurationAsync(db, ct);

        if (config.UpdatedAt != request.ExpectedUpdatedAt)
            throw new ConflictException("CONFIG_CHANGED", "การตั้งค่านี้ถูกแก้ไขไปแล้วโดยผู้อื่น กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง");

        if (request.IsEnabled)
        {
            var hasActiveSubject = await db.ExternalTicketSubjects.AnyAsync(s => s.IsActive, ct);
            if (!hasActiveSubject)
                throw new ConflictException("EXTERNAL_CONFIG_NOT_READY", "ต้องมีหัวข้อแจ้งเรื่องที่ active อย่างน้อย 1 รายการ ก่อนเปิดใช้งานช่องทาง");
        }

        var oldValues = new { config.IsEnabled, config.RequireOaFriendship };

        config.RequireOaFriendship = request.RequireOaFriendship;
        config.IsEnabled = request.IsEnabled;
        config.UpdatedAt = DateTime.UtcNow.AddHours(7);
        config.UpdatedBy = currentUser.EmployeeId;
        await db.SaveChangesAsync(ct);

        await auditLog.LogAsync("ticket", "ExternalTicketConfiguration", config.Id.ToString(), "update",
            "แก้ไขการตั้งค่าช่องทางแจ้งเรื่องสำหรับบุคคลภายนอก", oldValues,
            new { config.IsEnabled, config.RequireOaFriendship }, ct);

        return new ExternalTicketConfigurationDto(config.Id, config.TargetCompanyId,
            config.IsEnabled, config.RequireOaFriendship, config.UpdatedAt);
    }
}
