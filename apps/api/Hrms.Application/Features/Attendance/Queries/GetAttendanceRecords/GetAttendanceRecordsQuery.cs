using Hrms.Application.Common.Models;
using Hrms.Application.Features.Attendance.Dtos;
using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Attendance.Queries.GetAttendanceRecords;

public record GetAttendanceRecordsQuery(
    Guid? EmployeeId,
    Guid? DepartmentId,
    DateOnly? DateFrom,
    DateOnly? DateTo,
    AttendanceStatus? Status,
    string? Search,
    Guid? CompanyId,
    int Page,
    int PageSize) : IRequest<PagedResult<AttendanceRecordHrDto>>;
