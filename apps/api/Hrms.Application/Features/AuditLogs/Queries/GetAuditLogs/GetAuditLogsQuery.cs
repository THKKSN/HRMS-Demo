using Hrms.Application.Common.Models;
using Hrms.Application.Features.AuditLogs.Dtos;
using MediatR;

namespace Hrms.Application.Features.AuditLogs.Queries.GetAuditLogs;

public record GetAuditLogsQuery(
    string? Module,
    string? EntityType,
    string? EntityId,
    string? Action,
    Guid? PerformedByEmployeeId,
    DateTime? DateFrom,
    DateTime? DateTo,
    int Page,
    int PageSize) : IRequest<PagedResult<AuditLogDto>>;
