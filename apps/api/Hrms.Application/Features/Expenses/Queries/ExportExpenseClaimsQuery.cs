using Hrms.Domain.Enums;
using MediatR;

namespace Hrms.Application.Features.Expenses.Queries;

public record ExportExpenseClaimsQuery(
    ExpenseClaimStatus? Status = ExpenseClaimStatus.Approved,
    ExpenseClaimType? Type = null,
    Guid? EmployeeId = null,
    string? EmployeeSearch = null,
    DateOnly? DateFrom = null,
    DateOnly? DateTo = null,
    string Format = "xlsx") : IRequest<ExpenseClaimsExportResult>;

public record ExpenseClaimsExportResult(
    byte[] Content,
    string FileName,
    string ContentType,
    int RowCount);
