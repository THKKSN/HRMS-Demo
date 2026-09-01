using Hrms.Application.Common.Exceptions;
using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Entities;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Application.Features.Memos.Queries;

public record GetMemoPrintQuery(Guid Id) : IRequest<MemoPrintResult>;

public record MemoPrintResult(byte[] Content, string MemoNo);

public class GetMemoPrintHandler(IApplicationDbContext db, IMemoPdfGenerator pdfGenerator)
    : IRequestHandler<GetMemoPrintQuery, MemoPrintResult>
{
    public async Task<MemoPrintResult> Handle(GetMemoPrintQuery request, CancellationToken ct)
    {
        var memo = await db.Memos
            .Include(x => x.MemoType)
            .Include(x => x.Requester)
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.ApprovedByEmployee)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct)
            ?? throw new KeyNotFoundException("ไม่พบเรื่อง");

        if (memo.Status != MemoStatus.Approved)
            throw new ConflictException("MEMO_NOT_APPROVED", "พิมพ์เอกสารได้เฉพาะเรื่องที่อนุมัติแล้วเท่านั้น");

        // ApprovedAt/ApprovedByEmployee ต้องมีค่าเสมอเมื่อ Status=Approved (ApproveMemoCommand set คู่กันเสมอ)
        var data = new MemoPrintData(
            memo.Id,memo.MemoNo, memo.MemoType.Name, memo.MemoCategoryNameSnapshot, memo.MemoSubCategoryNameSnapshot,
            memo.Detail, FullName(memo.Requester), memo.Company.Name, memo.Department.Name,
            memo.CreatedAt, memo.ApprovedAt!.Value, FullName(memo.ApprovedByEmployee!));

        return new MemoPrintResult(pdfGenerator.Generate(data), memo.MemoNo);
    }

    private static string FullName(Employee employee)
        => $"{employee.FirstName} {employee.LastName}".Trim();
}
