using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Memos.Commands;
using Hrms.Application.Features.Memos.Dtos;
using Hrms.Application.Features.Memos.Queries;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/memo-types")]
[Authorize]
public class MemoTypeController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] bool includeInactive, CancellationToken ct)
        => Ok(await mediator.Send(new GetMemoTypesQuery(includeInactive), ct));

    [HttpPost]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Create([FromBody] CreateMemoTypeCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
            return Ok(result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMemoTypeRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new UpdateMemoTypeCommand(
                id, request.Name, request.CompanyId, request.DepartmentId, request.NameEn, request.NameId), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleStatusRequest request, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new ToggleMemoTypeStatusCommand(id, request.IsActive), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("{memoTypeId:guid}/categories")]
    public async Task<IActionResult> GetCategories(Guid memoTypeId, [FromQuery] bool includeInactive, CancellationToken ct)
        => Ok(await mediator.Send(new GetMemoCategoriesQuery(memoTypeId, includeInactive), ct));

    [HttpPatch("{id:guid}/first-approver")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> SetFirstApprover(Guid id, [FromBody] SetFirstApproverRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new SetMemoTypeFirstApproverCommand(id, request.RoleCode, request.EmployeeId), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpGet("{memoTypeId:guid}/workflow-steps")]
    public async Task<IActionResult> GetWorkflowSteps(Guid memoTypeId, [FromQuery] bool includeInactive, CancellationToken ct)
        => Ok(await mediator.Send(new GetMemoWorkflowStepsQuery(memoTypeId, includeInactive), ct));

    [HttpPost("{memoTypeId:guid}/workflow-steps")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> CreateWorkflowStep(Guid memoTypeId, [FromBody] SaveMemoWorkflowStepRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new CreateMemoWorkflowStepCommand(
                memoTypeId, request.Label, request.StepKind, request.AssigneeRoleCode,
                request.AssigneeEmployeeId, request.SortOrder), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }
}

[ApiController]
[Route("v1/memo-workflow-steps")]
[Authorize]
public class MemoWorkflowStepController(IMediator mediator) : ControllerBase
{
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveMemoWorkflowStepRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new UpdateMemoWorkflowStepCommand(
                id, request.Label, request.StepKind, request.AssigneeRoleCode,
                request.AssigneeEmployeeId, request.SortOrder), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleStatusRequest request, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new ToggleMemoWorkflowStepStatusCommand(id, request.IsActive), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }
}

[ApiController]
[Route("v1/memo-categories")]
[Authorize]
public class MemoCategoryController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Create([FromBody] CreateMemoCategoryCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNameRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new UpdateMemoCategoryCommand(
                id, request.Name, request.NameEn, request.NameId), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleStatusRequest request, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new ToggleMemoCategoryStatusCommand(id, request.IsActive), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("{categoryId:guid}/sub-categories")]
    public async Task<IActionResult> GetSubCategories(Guid categoryId, [FromQuery] bool includeInactive, CancellationToken ct)
        => Ok(await mediator.Send(new GetMemoSubCategoriesQuery(categoryId, includeInactive), ct));
}

[ApiController]
[Route("v1/memo-sub-categories")]
[Authorize]
public class MemoSubCategoryController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Create([FromBody] CreateMemoSubCategoryCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNameRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new UpdateMemoSubCategoryCommand(
                id, request.Name, request.NameEn, request.NameId), ct);
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
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "perm:system:manage-memo")]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleStatusRequest request, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new ToggleMemoSubCategoryStatusCommand(id, request.IsActive), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}

[ApiController]
[Route("v1/memos")]
[Authorize]
public class MemoController(IMediator mediator, IMemoryCache cache) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMemoCommand command, CancellationToken ct)
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetMemoByIdQuery(id), ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine([FromQuery] MemoStatus? status, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetMyMemosQuery(status), ct));
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("for-approval")]
    public async Task<IActionResult> GetForApproval([FromQuery] MemoStatus? status, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetMemosForApprovalQuery(status), ct));
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpGet("step-tasks")]
    public async Task<IActionResult> GetStepTasks(CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetMemoStepTasksQuery(), ct));
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/steps/{stepId:guid}/complete")]
    public async Task<IActionResult> CompleteStep(Guid id, Guid stepId, [FromBody] CompleteMemoStepRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new CompleteMemoStepCommand(id, stepId, request.Note, request.Attachments), ct));

    [HttpPost("{id:guid}/steps/{stepId:guid}/approve")]
    public async Task<IActionResult> ApproveStep(Guid id, Guid stepId, [FromBody] ApproveMemoStepRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new ApproveMemoStepCommand(id, stepId, request.Comment), ct));

    [HttpPost("{id:guid}/steps/{stepId:guid}/reject")]
    public async Task<IActionResult> RejectStep(Guid id, Guid stepId, [FromBody] RejectMemoStepRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new RejectMemoStepCommand(id, stepId, request.Reason), ct));

    [HttpPost("{id:guid}/steps/{stepId:guid}/return")]
    public async Task<IActionResult> ReturnStep(Guid id, Guid stepId, [FromBody] ReturnMemoStepRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new ReturnMemoStepCommand(
            id, stepId, request.Reason, request.TargetStepInstanceId, request.ToRequester), ct));

    // ผู้ขอส่งเรื่องที่ถูกตีกลับมาหาตัวเองกลับเข้า workflow
    [HttpPost("{id:guid}/resubmit")]
    public async Task<IActionResult> Resubmit(Guid id, [FromBody] ResubmitMemoRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new ResubmitMemoCommand(id, request.Note), ct));

    [HttpPost("{id:guid}/activities")]
    public async Task<IActionResult> AddActivity(Guid id, [FromBody] AddMemoActivityRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new AddMemoActivityCommand(id, request.Message, request.Attachments), ct));

    // แก้ได้เฉพาะข้อความ — ไฟล์แนบเดิมคงอยู่ (ถ้าต้องแนบเพิ่มให้เขียนบันทึกใบใหม่)
    [HttpPut("{id:guid}/activities/{activityId:guid}")]
    public async Task<IActionResult> UpdateActivity(
        Guid id, Guid activityId, [FromBody] UpdateMemoActivityRequest request, CancellationToken ct)
        => await HandleStepAction(() => mediator.Send(new UpdateMemoActivityCommand(id, activityId, request.Message), ct));

    // error mapping ชุดเดียวกันของกลุ่มคำสั่ง step/activity
    private async Task<IActionResult> HandleStepAction<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox([FromQuery] bool includeDelivered, CancellationToken ct)
    {
        try
        {
            return Ok(await mediator.Send(new GetMemoInboxQuery(includeDelivered), ct));
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

    [HttpPost("{id:guid}/acknowledge")]
    public async Task<IActionResult> Acknowledge(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new AcknowledgeMemoCommand(id), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/deliver")]
    public async Task<IActionResult> Deliver(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new DeliverMemoCommand(id), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/receive")]
    public async Task<IActionResult> Receive(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new ReceiveMemoCommand(id), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    private const int PrintTokenTtlSeconds = 120;

    /// <summary>
    /// ขอ token อายุสั้นสำหรับเปิด PDF ผ่าน URL ตรงในแท็บใหม่ (แนบ JWT header ไม่ได้)
    /// — เปิดผ่าน URL จริงทำให้ PDF viewer ใช้ชื่อไฟล์จาก Content-Disposition ({MemoNo}.pdf) แทน UUID ของ blob
    /// </summary>
    [HttpPost("{id:guid}/print-token")]
    public IActionResult CreatePrintToken(Guid id)
    {
        var token = Guid.NewGuid().ToString("N");
        cache.Set($"memo-print-token:{token}", id, TimeSpan.FromSeconds(PrintTokenTtlSeconds));
        return Ok(new { token, expiresIn = PrintTokenTtlSeconds });
    }

    [HttpGet("{id:guid}/print")]
    [AllowAnonymous]
    public async Task<IActionResult> Print(Guid id, [FromQuery] string? token, CancellationToken ct)
    {
        var tokenValid = !string.IsNullOrEmpty(token)
            && cache.TryGetValue($"memo-print-token:{token}", out Guid memoId)
            && memoId == id;
        if (!tokenValid && User.Identity?.IsAuthenticated != true)
            return Unauthorized(new { error = "PRINT_TOKEN_INVALID", message = "The document link has expired. Print again." });

        try
        {
            var result = await mediator.Send(new GetMemoPrintQuery(id), ct);
            // inline = เปิดใน viewer (ไม่บังคับดาวน์โหลด) แต่ยังบอกชื่อไฟล์ให้ปุ่ม save ของ viewer ใช้
            Response.Headers.ContentDisposition = $"inline; filename=\"{result.MemoNo}.pdf\"";
            return File(result.Content, "application/pdf");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveMemoRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new ApproveMemoCommand(id, request.Comment), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectMemoRequest request, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new RejectMemoCommand(id, request.Reason), ct);
            return Ok(result);
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
    }
}

public record ApproveMemoRequest(string? Comment);
public record RejectMemoRequest(string? Reason);
// NameEn/NameId = ชื่อหลายภาษาของ master data (i18n Phase M) — ไม่ส่ง = คงค่าเดิม, ส่ง "" = ล้างค่า
public record UpdateNameRequest(string Name, string? NameEn = null, string? NameId = null);
public record UpdateMemoTypeRequest(string Name, Guid CompanyId, Guid DepartmentId, string? NameEn = null, string? NameId = null);
// EmployeeId = null คือทุกคนใน role นั้น
public record SetFirstApproverRequest(RoleType RoleCode, Guid? EmployeeId);
public record SaveMemoWorkflowStepRequest(
    string Label, MemoStepKind StepKind, RoleType AssigneeRoleCode,
    Guid? AssigneeEmployeeId, int SortOrder);
public record CompleteMemoStepRequest(string? Note, List<MemoAttachmentInput>? Attachments = null);
public record ApproveMemoStepRequest(string? Comment);
public record RejectMemoStepRequest(string Reason);
// TargetStepInstanceId = null คือขั้นก่อนหน้าติดกัน · ToRequester = true คือย้อนถึงผู้ขอ (ขั้น Approval เท่านั้น)
public record ReturnMemoStepRequest(
    string Reason, Guid? TargetStepInstanceId = null, bool ToRequester = false);
public record ResubmitMemoRequest(string? Note);
public record AddMemoActivityRequest(string Message, List<MemoAttachmentInput>? Attachments = null);
public record UpdateMemoActivityRequest(string Message);
