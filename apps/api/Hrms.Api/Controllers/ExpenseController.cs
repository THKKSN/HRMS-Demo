using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Expenses.Commands;
using Hrms.Application.Features.Expenses.Dtos;
using Hrms.Application.Features.Expenses.Queries;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/expenses")]
[Authorize]
public class ExpenseController(IMediator mediator) : ControllerBase
{
    /// <summary>สร้างรายการบิล/เบิกค่าใช้จ่ายแบบแนบหลักฐาน</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpenseClaimCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    /// <summary>แก้ไขแบบร่าง หรือส่งแบบร่างเข้าตรวจ</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateExpenseClaimCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command with { Id = id }, ct);
            return Ok(result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ลบรายการแบบร่างและไฟล์แนบที่อัปโหลดไว้</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteDraft(Guid id, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new DeleteExpenseClaimCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>Export Excel รายการบิลตาม filter สำหรับบัญชี</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] ExpenseClaimStatus? status = ExpenseClaimStatus.Approved,
        [FromQuery] ExpenseClaimType? type = null,
        [FromQuery] Guid? employeeId = null,
        [FromQuery] string? employeeSearch = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        [FromQuery] string format = "xlsx",
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new ExportExpenseClaimsQuery(
                status,
                type,
                employeeId,
                employeeSearch,
                dateFrom,
                dateTo,
                format), ct);

            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>รายการบิลทั้งหมดสำหรับ Admin/HR</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] ExpenseClaimStatus? status = null,
        [FromQuery] ExpenseClaimType? type = null,
        [FromQuery] Guid? employeeId = null,
        [FromQuery] string? employeeSearch = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await mediator.Send(new GetExpenseClaimsQuery(
                status,
                type,
                employeeId,
                employeeSearch,
                dateFrom,
                dateTo,
                page,
                pageSize), ct));
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>อนุมัติรายการสร้างบิล</summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ReviewExpenseClaimRequest? request, CancellationToken ct)
        => await Review(() => mediator.Send(new ApproveExpenseClaimCommand(id, request?.Comment), ct));

    /// <summary>ปฏิเสธรายการสร้างบิล</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ReviewExpenseClaimRequest? request, CancellationToken ct)
        => await Review(() => mediator.Send(new RejectExpenseClaimCommand(id, request?.Comment ?? ""), ct));

    /// <summary>เริ่ม OCR แบบ async สำหรับใบสั่งจ่าย/ใบเสร็จของรายการนี้</summary>
    [HttpPost("{id:guid}/ocr")]
    public async Task<IActionResult> StartOcr(Guid id, CancellationToken ct)
    {
        try
        {
            return Accepted(await mediator.Send(new StartExpenseOcrCommand(id), ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>อ่านสถานะและผล OCR ล่าสุดของรายการนี้</summary>
    [HttpGet("{id:guid}/ocr-result")]
    public async Task<IActionResult> GetOcrResult(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetExpenseOcrResultQuery(id), ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>นำ field ที่ผู้ใช้ยืนยันจาก OCR ไปเติมรายการแบบร่าง</summary>
    [HttpPost("{id:guid}/ocr/apply")]
    public async Task<IActionResult> ApplyOcr(Guid id, [FromBody] ApplyExpenseOcrRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new ApplyExpenseOcrCommand(id, request), ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>รายการบิลของตัวเอง</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMy(
        [FromQuery] ExpenseClaimStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            return Ok(await mediator.Send(new GetMyExpenseClaimsQuery(status, page, pageSize), ct));
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>รายละเอียดบิลของตัวเอง</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetExpenseClaimByIdQuery(id), ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    private async Task<IActionResult> Review(Func<Task<ExpenseClaimDto>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}

public record ReviewExpenseClaimRequest(string? Comment);
