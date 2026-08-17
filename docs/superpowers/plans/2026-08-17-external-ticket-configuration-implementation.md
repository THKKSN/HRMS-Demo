# แผนลงมือทำ External Ticket Configuration

> **สำหรับผู้ปฏิบัติงานแบบ agentic:** ต้องใช้ sub-skill `superpowers:subagent-driven-development` (แนะนำ) หรือ `superpowers:executing-plans` เพื่อทำตาม task ทีละข้อ โดยใช้ checkbox (`- [ ]`) ติดตามสถานะ

**เป้าหมาย:** พัฒนา Phase 2 Task 4 เพื่อให้ผู้ดูแลกำหนดช่องทาง external ticket และ taxonomy ที่ map ไปยัง internal subject ได้อย่างปลอดภัย โดยยังไม่เปิดรับแจ้งเรื่องจริง

**สถาปัตยกรรม:** เก็บ configuration เพียงหนึ่งแถวสำหรับ fixed company ใน `external_ticket_configurations`; taxonomy external เป็น hierarchy แยก 3 ระดับและ map internal ได้เฉพาะ leaf subject. Handler ใน Application เป็นจุดบังคับ permission, fixed-company, readiness, version และ audit ส่วน controller ทำหน้าที่แปลง HTTP request เป็น MediatR command/query เท่านั้น.

**เทคโนโลยี:** .NET 8, ASP.NET Core, MediatR, FluentValidation, EF Core 8/Pomelo MySQL, xUnit, FluentAssertions

## ข้อกำหนดร่วม

- Fixed company คือ `ExternalTicketConstants.TargetCompanyId = c89cb0d1-7548-4c1b-a36a-929f094f0b30`; ห้ามรับ `CompanyId` จาก client
- ใช้ permission `ticket:manage-external-config` สำหรับทุก Admin mutation และกำหนดให้ Admin default role
- Taxonomy ใช้ soft activation เท่านั้น ไม่มี hard-delete endpoint
- Channel เปิดได้เมื่อ target department และ privacy notice พร้อม และมี active external subject ที่ map ไปยัง active internal subject ใน target department เดียวกัน
- `ExpectedUpdatedAt` ที่ไม่ตรงคืน `ConflictException("CONFIG_CHANGED", ...)` ซึ่ง middleware แปลงเป็น HTTP 409
- Audit ของ configuration เก็บชื่อ node, active state, department และ internal-subject mapping เท่านั้น ห้ามบันทึก LINE/contact PII
- Migration `AddExternalTicketConfiguration` สร้างได้เฉพาะ external configuration/category/topic/subject tables, index, FK และ disabled configuration seed
- Task นี้ไม่สร้าง external ticket, upload, Rich Menu route, Admin UI หรือ deploy production

---

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `apps/api/Hrms.Domain/Constants/ExternalTicketConstants.cs` | fixed company และ deterministic configuration ID สำหรับ seed |
| `apps/api/Hrms.Domain/Entities/ExternalTicket*.cs` | entity ของ configuration และ taxonomy ภายนอก |
| `apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicket*.cs` | ชื่อตาราง, column, index, FK และ seed mapping ของ EF |
| `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationModels.cs` | DTO และ public-form DTO ที่ไม่เปิด internal mapping |
| `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationCommands.cs` | command, validator, permission/readiness/concurrency และ audit |
| `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationQueries.cs` | Admin query และ external-session form query |
| `apps/api/Hrms.Api/Controllers/ExternalTicketConfigurationController.cs` | HTTP contracts และ routes ของ Task 4 |
| `apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs` | focused handler/query tests ด้วย InMemory database |
| `apps/api/Hrms.Infrastructure/Migrations/*AddExternalTicketConfiguration*.cs` | migration และ model snapshot ที่ EF สร้าง |

## Task 1: สร้าง Domain/Persistence Schema พร้อมการทดสอบ

**ไฟล์:**
- Create: `apps/api/Hrms.Domain/Constants/ExternalTicketConstants.cs`
- Create: `apps/api/Hrms.Domain/Entities/ExternalTicketConfiguration.cs`
- Create: `apps/api/Hrms.Domain/Entities/ExternalTicketCategory.cs`
- Create: `apps/api/Hrms.Domain/Entities/ExternalTicketTopic.cs`
- Create: `apps/api/Hrms.Domain/Entities/ExternalTicketSubject.cs`
- Create: `apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicketConfigurationConfiguration.cs`
- Create: `apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicketCategoryConfiguration.cs`
- Create: `apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicketTopicConfiguration.cs`
- Create: `apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicketSubjectConfiguration.cs`
- Modify: `apps/api/Hrms.Application/Common/Interfaces/IApplicationDbContext.cs`
- Modify: `apps/api/Hrms.Infrastructure/Persistence/HrmsDbContext.cs`
- Test: `apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs`

**Interfaces:**
- Produces `ExternalTicketConfiguration` with `CompanyId`, nullable `TargetDepartmentId`, `IsEnabled`, `RequireOaFriendship`, nullable privacy fields, and BaseEntity timestamps
- Produces category/topic/subject hierarchy; subject owns `InternalTicketSubjectId`
- Produces `IApplicationDbContext.ExternalTicketConfigurations`, `ExternalTicketCategories`, `ExternalTicketTopics`, and `ExternalTicketSubjects`

ก่อนเพิ่ม test แรก ให้สร้าง test support แบบ nested ในไฟล์เดียวกัน: `CreateDb()` ใช้ `UseInMemoryDatabase($"external-config-{Guid.NewGuid():N}")`; `TestPermissionService` ที่มีอยู่รับ permission ที่ grant; `CapturingAuditLogService : IAuditLogService` เก็บเฉพาะ invocation count; และ `TestExternalCurrentUser : IExternalCurrentUser` คืน `ExternalReporterId = Guid.NewGuid()`, `LineUserId = "U-external-config-test"`, `IsAuthenticated = true`. เพิ่ม helper `AddConfigurationAsync`, `AddActiveExternalTopicAsync`, `AddInternalSubjectAsync` และ `AddExternalTreeAsync` ในไฟล์เดียวกัน โดย helper ทุกตัวสร้าง company/department/category/topic/subject ที่ active ตาม boolean arguments และเรียก `SaveChangesAsync` ก่อนคืนค่า.

- [ ] **Step 1: เขียน focused test ที่อ้างถึง schema ที่ยังไม่มี**

```csharp
[Fact]
public async Task ConfigurationSchema_ShouldUseFixedCompanyAndExternalSubjectMapping()
{
    await using var db = CreateDb();
    var category = new ExternalTicketCategory { Name = "บริการ" };
    var topic = new ExternalTicketTopic { Category = category, Name = "ซ่อม" };
    var internalSubjectId = Guid.NewGuid();
    db.ExternalTicketSubjects.Add(new ExternalTicketSubject
    {
        Topic = topic,
        Name = "แจ้งซ่อมอาคาร",
        InternalTicketSubjectId = internalSubjectId
    });
    await db.SaveChangesAsync();

    (await db.ExternalTicketSubjects.SingleAsync()).InternalTicketSubjectId.Should().Be(internalSubjectId);
}
```

- [ ] **Step 2: รัน test เพื่อยืนยัน RED**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: FAIL ตอน compile เพราะ `ExternalTicketCategory`, `ExternalTicketTopic` และ `ExternalTicketSubject` ยังไม่มี

- [ ] **Step 3: เพิ่ม constants และ entities ขนาดเล็กตามขอบเขต**

```csharp
public static class ExternalTicketConstants
{
    public static readonly Guid TargetCompanyId = new("c89cb0d1-7548-4c1b-a36a-929f094f0b30");
    public static readonly Guid ConfigurationId = new("d31e84a1-0c72-4479-92bf-1cff5439b395");
}

public sealed class ExternalTicketSubject : BaseEntity
{
    public Guid TopicId { get; set; }
    public Guid InternalTicketSubjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public ExternalTicketTopic Topic { get; set; } = null!;
    public TicketSubject InternalTicketSubject { get; set; } = null!;
}
```

`ExternalTicketConfiguration` เก็บ `CompanyId`, `TargetDepartmentId`, `IsEnabled`, `RequireOaFriendship`, `PrivacyNoticeVersion`, `PrivacyNoticeUrl`; category เก็บชื่อ/คำอธิบาย/ลำดับ/สถานะ; topic มี `CategoryId`; ทุก entity ใช้ `BaseEntity`.

- [ ] **Step 4: เพิ่ม EF mapping และ DbSet**

กำหนด `char(36)` ให้ GUID, `datetime` ให้ timestamps, name สูงสุด 200, description สูงสุด 500 และ privacy URL สูงสุด 2000. ใช้ unique index ต่อไปนี้:

```csharp
builder.HasIndex(x => x.CompanyId).IsUnique();                 // configuration singleton
builder.HasIndex(x => x.Name).IsUnique();                      // category
builder.HasIndex(x => new { x.CategoryId, x.Name }).IsUnique(); // topic
builder.HasIndex(x => new { x.TopicId, x.Name }).IsUnique();    // subject
```

configuration มี FK `CompanyId` แบบ Restrict และ `TargetDepartmentId` แบบ SetNull; category → topic และ topic → subject ใช้ Cascade; subject → `TicketSubject` ใช้ Restrict. เพิ่ม DbSet ทั้งสี่ให้ interface และ context.

ให้ `ExternalTicketConfigurationConfiguration` seed แถวเดียวด้วย `HasData(new { Id = ExternalTicketConstants.ConfigurationId, CompanyId = ExternalTicketConstants.TargetCompanyId, IsEnabled = false, RequireOaFriendship = true, CreatedAt = new DateTime(2026, 8, 17, 0, 0, 0), UpdatedAt = new DateTime(2026, 8, 17, 0, 0, 0) })`; privacy fields และ `TargetDepartmentId` เป็น null จนกว่าผู้ดูแลจะตั้งค่า.

- [ ] **Step 5: รัน focused test เพื่อยืนยัน GREEN**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: PASS สำหรับ schema test; test ที่เป็น handler ใน task ถัดไปยังไม่ถูกเพิ่ม

- [ ] **Step 6: Commit schema model**

```bash
git add apps/api/Hrms.Domain/Constants/ExternalTicketConstants.cs \
  apps/api/Hrms.Domain/Entities/ExternalTicket*.cs \
  apps/api/Hrms.Infrastructure/Persistence/Configurations/ExternalTicket*.cs \
  apps/api/Hrms.Application/Common/Interfaces/IApplicationDbContext.cs \
  apps/api/Hrms.Infrastructure/Persistence/HrmsDbContext.cs \
  apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs
git commit -m "feat: add external ticket configuration schema"
```

## Task 2: Configuration command, permission, readiness และ audit

**ไฟล์:**
- Create: `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationModels.cs`
- Create: `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationCommands.cs`
- Modify: `apps/api/Hrms.Infrastructure/Persistence/PermissionSeeder.cs`
- Modify: `apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs`

**Interfaces:**
- Consumes `ExternalTicketConstants`, DbSet จาก Task 1, `ICurrentUser`, `IPermissionService`, `IAuditLogService`
- Produces `GetExternalTicketConfigurationDto` และ `UpdateExternalTicketConfigurationCommand(Guid? TargetDepartmentId, bool IsEnabled, bool RequireOaFriendship, string? PrivacyNoticeVersion, string? PrivacyNoticeUrl, DateTime? ExpectedUpdatedAt)`

- [ ] **Step 1: เพิ่ม failing tests สำหรับ permission, fixed company, readiness และ stale version**

```csharp
[Fact]
public async Task Enable_ShouldRejectDepartmentOutsideFixedCompany()
{
    await using var db = CreateDb();
    var handler = CreateConfigHandler(db, granted: "ticket:manage-external-config");
    db.Departments.Add(new Department { Id = OtherDepartmentId, CompanyId = Guid.NewGuid(), Name = "อื่น" });
    await db.SaveChangesAsync();

    var act = () => handler.Handle(new UpdateExternalTicketConfigurationCommand(
        OtherDepartmentId, true, true, "privacy-2026-08", "https://example.com/privacy", null), default);

    await act.Should().ThrowAsync<FluentValidation.ValidationException>();
}

[Fact]
public async Task Update_ShouldRejectStaleExpectedUpdatedAt()
{
    await using var db = CreateDb();
    var config = await AddConfigurationAsync(db, TargetDepartmentId, isEnabled: false);
    var handler = CreateConfigHandler(db, granted: "ticket:manage-external-config");

    var act = () => handler.Handle(new UpdateExternalTicketConfigurationCommand(
        TargetDepartmentId, false, true, null, null, config.UpdatedAt.AddSeconds(-1)), default);

    (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("CONFIG_CHANGED");
}
```

เพิ่ม test อีกสามกรณี: ไม่มี permission ได้ `AppForbiddenException`; enable โดยไม่มี privacy fields ไม่ผ่าน validation; enable โดยไม่มี active mapped external subject ไม่ผ่าน validation.

- [ ] **Step 2: รัน focused tests เพื่อยืนยัน RED**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: FAIL เพราะ command/handler และ DTO ยังไม่มี

- [ ] **Step 3: เพิ่ม permission และ DTO/validator**

เพิ่ม `("ticket:manage-external-config", "ticket", "manage", "จัดการการตั้งค่าช่องทางแจ้งเรื่องภายนอก")` ใน `AllPermissions` และเพิ่ม code นี้เฉพาะ `Admin` ใน `DefaultRolePermissions`.

Validator ต้องกำหนด privacy field เป็น optional เมื่อ `IsEnabled == false` และเมื่อเปิดใช้ ต้องไม่ว่างทั้งคู่, privacy version ยาวไม่เกิน 100 และ URL ยาวไม่เกิน 2000. ห้ามรับ CompanyId ใน command หรือ DTO.

- [ ] **Step 4: เขียน handler ให้บังคับ readiness ก่อนบันทึก**

```csharp
await currentUser.ThrowIfNoPermissionAsync(permissionService, "ticket:manage-external-config", ct);
var configuration = await db.ExternalTicketConfigurations.SingleAsync(
    item => item.CompanyId == ExternalTicketConstants.TargetCompanyId, ct);
if (request.ExpectedUpdatedAt is { } expected && expected != configuration.UpdatedAt)
    throw new ConflictException("CONFIG_CHANGED", "การตั้งค่าถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด");

var department = await db.Departments.SingleOrDefaultAsync(
    item => item.Id == request.TargetDepartmentId!.Value
        && item.CompanyId == ExternalTicketConstants.TargetCompanyId
        && item.IsActive, ct);
if (request.TargetDepartmentId.HasValue && department is null)
    throw new FluentValidation.ValidationException("TARGET_DEPARTMENT_INVALID");
```

เมื่อ `IsEnabled` เป็น true ให้ตรวจ target department, privacy และ query `ExternalTicketSubjects` ที่ active, parent topic/category active, และ `InternalTicketSubject` active โดย `CompanyId`/`DepartmentId` ตรง target. บันทึกค่าใหม่แล้วเรียก `auditLog.LogAsync("ticket", "ExternalTicketConfiguration", configuration.Id.ToString(), "update", ...)` ด้วย anonymous old/new values ที่ไม่มี PII.

- [ ] **Step 5: รัน focused tests เพื่อยืนยัน GREEN**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: PASS ทุก permission/readiness/concurrency test ของ configuration

- [ ] **Step 6: Commit configuration command**

```bash
git add apps/api/Hrms.Application/Features/ExternalTickets/Configuration \
  apps/api/Hrms.Infrastructure/Persistence/PermissionSeeder.cs \
  apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs
git commit -m "feat: add external ticket channel configuration"
```

## Task 3: Taxonomy command/query และ public form ที่ไม่เปิด mapping

**ไฟล์:**
- Modify: `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationModels.cs`
- Modify: `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationCommands.cs`
- Create: `apps/api/Hrms.Application/Features/ExternalTickets/Configuration/ExternalTicketConfigurationQueries.cs`
- Modify: `apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs`

**Interfaces:**
- Produces `Create/UpdateExternalTicketCategoryCommand`, `Create/UpdateExternalTicketTopicCommand`, `Create/UpdateExternalTicketSubjectCommand`
- Produces `GetExternalTicketConfigurationQuery` สำหรับ Admin และ `GetExternalTicketFormQuery` สำหรับ external bearer
- Public DTO มี `Id`, `Name`, `Description`, `SortOrder`, `Categories`, `Topics`, `Subjects` เท่านั้น และไม่มี `InternalTicketSubjectId`

- [ ] **Step 1: เขียน failing tests สำหรับ mapping และ public filtering**

```csharp
[Fact]
public async Task CreateSubject_ShouldRejectInactiveOrCrossDepartmentInternalSubject()
{
    await using var db = CreateDb();
    var topic = await AddActiveExternalTopicAsync(db);
    var handler = CreateTaxonomyHandler(db, granted: "ticket:manage-external-config");
    var invalidInternalSubjectId = await AddInternalSubjectAsync(db, OtherCompanyId, OtherDepartmentId, isActive: false);

    var act = () => handler.Handle(new CreateExternalTicketSubjectCommand(
        topic.Id, invalidInternalSubjectId, "แจ้งซ่อม", null, 0), default);

    await act.Should().ThrowAsync<FluentValidation.ValidationException>();
}

[Fact]
public async Task PublicForm_ShouldHideInactiveNodesAndInternalMappings()
{
    await using var db = CreateDbWithReadyConfigurationAsync();
    await AddExternalTreeAsync(db, activeCategory: true, activeTopic: true, activeSubject: true);
    await AddExternalTreeAsync(db, activeCategory: true, activeTopic: true, activeSubject: false);

    var result = await new GetExternalTicketFormHandler(db, new TestExternalCurrentUser()).Handle(new(), default);

    result.Categories.Single().Topics.Single().Subjects.Should().ContainSingle();
}
```

เพิ่ม test สำหรับ duplicate names ภายใต้ parent เดียวกัน, mutation เมื่อไม่มี permission, deactivate node แล้ว public form ซ่อนทั้ง subtree, และ update subject ที่ map ไป internal subject คนละ target department.

ใช้ `TestExternalCurrentUser` ที่ประกาศใน Task 1 สำหรับ public query; helper `CreateConfigHandler` ต้องประกอบ `UpdateExternalTicketConfigurationHandler(db, new TestCurrentUser(Guid.NewGuid(), ExternalTicketConstants.TargetCompanyId, null, RoleType.Admin), new TestPermissionService(granted), new CapturingAuditLogService())`; helper taxonomy ใช้ dependency ชุดเดียวกัน.

- [ ] **Step 2: รัน focused tests เพื่อยืนยัน RED**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: FAIL เพราะ taxonomy command/query ยังไม่มี

- [ ] **Step 3: เพิ่ม taxonomy commands และ validation กลาง**

ทุก mutation เรียก `ThrowIfNoPermissionAsync(..., "ticket:manage-external-config", ct)` ก่อนอ่านหรือเขียน. Subject command ตรวจว่าหัวข้อ external และ parent hierarchy มีอยู่; `InternalTicketSubject` ต้อง `IsActive`, อยู่ใน `ExternalTicketConstants.TargetCompanyId` และถ้า configuration มี `TargetDepartmentId` ต้องตรงกัน.

ใช้ command รูปแบบนี้เพื่อให้ contract คงที่:

```csharp
public sealed record CreateExternalTicketSubjectCommand(
    Guid TopicId, Guid InternalTicketSubjectId, string Name, string? Description, int SortOrder)
    : IRequest<ExternalTicketSubjectAdminDto>;

public sealed record UpdateExternalTicketSubjectCommand(
    Guid Id, Guid InternalTicketSubjectId, string Name, string? Description, int SortOrder, bool IsActive)
    : IRequest<ExternalTicketSubjectAdminDto>;
```

Category/topic ใช้ field เดียวกันโดย topic เพิ่ม `CategoryId`. ทุก handler trim name/description, reject name ซ้ำใน parent เดียวกันด้วย `ConflictException` และ audit old/new values ที่เป็น only name, active, sortOrder, parentId และ internalSubjectId.

- [ ] **Step 4: เพิ่ม admin query และ external public query**

Admin query ต้องคืน tree พร้อม internal mapping เพื่อใช้ Task 5. Public query ต้องตรวจ `IExternalCurrentUser.ExternalReporterId` ไม่เป็น null, โหลด config fixed company, และ:

```csharp
var categories = await db.ExternalTicketCategories.AsNoTracking()
    .Where(category => category.IsActive)
    .OrderBy(category => category.SortOrder).ThenBy(category => category.Name)
    .Select(category => new ExternalTicketFormCategoryDto(
        category.Id, category.Name, category.Description, category.SortOrder,
        category.Topics.Where(topic => topic.IsActive)
            .OrderBy(topic => topic.SortOrder).ThenBy(topic => topic.Name)
            .Select(topic => new ExternalTicketFormTopicDto(
                topic.Id, topic.Name, topic.Description, topic.SortOrder,
                topic.Subjects.Where(subject => subject.IsActive)
                    .OrderBy(subject => subject.SortOrder).ThenBy(subject => subject.Name)
                    .Select(subject => new ExternalTicketFormSubjectDto(
                        subject.Id, subject.Name, subject.Description, subject.SortOrder))
                    .ToList()))
            .ToList()))
    .ToListAsync(ct);
```

เมื่อ channel ปิด ให้คืน `ExternalTicketFormDto(IsEnabled: false, ...)` ที่ไม่มี taxonomy; ห้ามคืน usable form หรือ internal subject mapping.

- [ ] **Step 5: รัน focused tests เพื่อยืนยัน GREEN**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: PASS ทุก taxonomy validation, public filtering และ no-mapping exposure test

- [ ] **Step 6: Commit taxonomy commands/queries**

```bash
git add apps/api/Hrms.Application/Features/ExternalTickets/Configuration \
  apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs
git commit -m "feat: add external ticket taxonomy configuration"
```

## Task 4: เชื่อม HTTP controller กับ policy ที่ถูกต้อง

**ไฟล์:**
- Create: `apps/api/Hrms.Api/Controllers/ExternalTicketConfigurationController.cs`
- Modify: `apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs`

**Interfaces:**
- Consumes command/query จาก Tasks 2-3 และ `ExternalAuthDefaults.Scheme`/`ExternalAuthDefaults.Policy`
- Produces Admin routes ภายใต้ `/v1/external-ticket-config` และ public form route `/v1/external/ticket-form`

- [ ] **Step 1: เพิ่ม route-contract tests ที่ยืนยัน authentication boundary**

เพิ่ม reflection/endpoint metadata test ที่ตรวจว่า controller config มี `[Authorize]`, public form มี `[Authorize(AuthenticationSchemes = ExternalAuthDefaults.Scheme, Policy = ExternalAuthDefaults.Policy)]`, และ request record ไม่มี `CompanyId`.

- [ ] **Step 2: รัน test เพื่อยืนยัน RED**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: FAIL เพราะ controller และ request contract ยังไม่มี

- [ ] **Step 3: สร้าง controller และ HTTP records**

```csharp
[ApiController]
[Route("v1/external-ticket-config")]
[Authorize]
public sealed class ExternalTicketConfigurationController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public Task<ExternalTicketConfigurationAdminDto> Get(CancellationToken ct)
        => mediator.Send(new GetExternalTicketConfigurationQuery(), ct);

    [HttpPut]
    public async Task<IActionResult> Update(
        [FromBody] UpdateExternalTicketConfigurationRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateExternalTicketConfigurationCommand(
            request.TargetDepartmentId, request.IsEnabled, request.RequireOaFriendship,
            request.PrivacyNoticeVersion, request.PrivacyNoticeUrl, request.ExpectedUpdatedAt), ct));
}
```

เพิ่ม POST/PUT สำหรับแต่ละ taxonomy node. สร้าง controller หรือ action แยกที่ route `GET /v1/external/ticket-form` และใช้ external scheme/policy เท่านั้น. ปล่อย `ConflictException` ผ่านไปให้ `GlobalExceptionMiddleware` ตอบ `409 CONFIG_CHANGED`; controller ไม่ต้อง catch เพื่อไม่ทำ contract ซ้ำ.

- [ ] **Step 4: รัน route-contract และ focused handler tests เพื่อยืนยัน GREEN**

Run: `cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore`

Expected: PASS และ request contract ไม่มี company identifier

- [ ] **Step 5: Commit controller wiring**

```bash
git add apps/api/Hrms.Api/Controllers/ExternalTicketConfigurationController.cs \
  apps/api/Hrms.Application.Tests/ExternalTickets/ExternalTicketConfigurationTests.cs
git commit -m "feat: expose external ticket configuration APIs"
```

## Task 5: สร้าง migration และตรวจ allowlist

**ไฟล์:**
- Create: `apps/api/Hrms.Infrastructure/Migrations/*_AddExternalTicketConfiguration.cs`
- Create: `apps/api/Hrms.Infrastructure/Migrations/*_AddExternalTicketConfiguration.Designer.cs`
- Modify: `apps/api/Hrms.Infrastructure/Migrations/HrmsDbContextModelSnapshot.cs`

**Interfaces:**
- Consumes final EF entity mappings จาก Task 1
- Produces migration ที่สร้างเฉพาะ four external configuration tables และ disabled configuration seed

- [ ] **Step 1: ตรวจ scoped working tree ก่อน generate migration**

Run:

```bash
git status --short -- apps/api/Hrms.Domain apps/api/Hrms.Application apps/api/Hrms.Infrastructure apps/api/Hrms.Api
git diff -- apps/api/Hrms.Infrastructure/Migrations/HrmsDbContextModelSnapshot.cs
```

Expected: ตรวจให้แน่ใจว่า schema change ที่ยังไม่ committed มีเฉพาะ Task 4; หยุดถ้ามี model change จากงานอื่นปะปน

- [ ] **Step 2: generate migration ชื่อกำหนดตายตัว**

Run:

```powershell
cmd.exe /c dotnet ef migrations add AddExternalTicketConfiguration --project apps/api/Hrms.Infrastructure --startup-project apps/api/Hrms.Api --context HrmsDbContext --output-dir Migrations
```

Expected: EF สร้าง migration pair หนึ่งชุดและ update model snapshot

- [ ] **Step 3: ตรวจ migration allowlist ก่อนรัน test**

Run:

```bash
sed -n '/protected override void Up/,/protected override void Down/p' apps/api/Hrms.Infrastructure/Migrations/*AddExternalTicketConfiguration.cs \
  | rg -n "CreateTable|AddColumn|AlterColumn|CreateIndex|AddForeignKey|InsertData|DropTable|DropColumn"
sed -n '/protected override void Up/,/protected override void Down/p' apps/api/Hrms.Infrastructure/Migrations/*AddExternalTicketConfiguration.cs \
  | rg -n "tickets|expense_|leave_|attendance_|ticket_workflow|employee_roles" && exit 1 || true
```

Expected: operation list มีเพียง `external_ticket_configurations`, `external_ticket_categories`, `external_ticket_topics`, `external_ticket_subjects` พร้อม index/FK/seed; ไม่มี `DropTable`, `DropColumn` หรือ DDL ที่ไม่เกี่ยวข้อง

- [ ] **Step 4: รัน focused test, full test และ build**

Run:

```powershell
cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --filter "FullyQualifiedName~ExternalTicketConfigurationTests" --no-restore
cmd.exe /c dotnet test apps/api/Hrms.Application.Tests/Hrms.Application.Tests.csproj --no-restore
cmd.exe /c dotnet build apps/api/Hrms.Api/Hrms.Api.csproj -c Release --no-restore
```

Expected: focused tests และ full suite ผ่าน; Release build มี 0 errors. บันทึก warning เดิมหากยังมี แต่ห้ามเพิ่ม warning จาก Task 4.

- [ ] **Step 5: Commit migration และ verification artifacts**

```bash
git add apps/api/Hrms.Infrastructure/Migrations/*AddExternalTicketConfiguration* \
  apps/api/Hrms.Infrastructure/Migrations/HrmsDbContextModelSnapshot.cs
git commit -m "feat: add external ticket configuration migration"
```

## การส่งมอบ

Task 4 เสร็จเมื่อ migration ผ่าน allowlist, `ExternalTicketConfigurationTests` ผ่าน, full Application test suite ผ่าน และ Release API build ไม่มี error. จากนั้นเริ่ม Task 5 เพื่อสร้าง Admin UI บน API contract ที่ตรวจสอบแล้ว.
