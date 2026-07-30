using MediatR;

namespace Hrms.Application.Features.Reports.Queries.ExportAttendanceExcel;

public record ExportAttendanceExcelQuery(
    int Year,
    int Month,
    Guid? DepartmentId) : IRequest<byte[]>;
