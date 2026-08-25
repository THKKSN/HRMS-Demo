namespace Hrms.Application.Features.ExternalTickets.Dtos;

public record ExternalTicketConfigurationDto(
    Guid Id,
    Guid TargetCompanyId,
    bool IsEnabled,
    bool RequireOaFriendship,
    DateTime UpdatedAt);
