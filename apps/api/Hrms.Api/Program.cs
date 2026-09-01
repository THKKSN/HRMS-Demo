using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hrms.Api.Authorization;
using Hrms.Api.Middleware;
using Hrms.Api.Services;
using Hrms.Application;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure;
using Hrms.Infrastructure.Jobs;
using Hrms.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text.Json;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

// ใช้ Community license — ฟรีสำหรับองค์กรที่รายได้ต่อปีไม่เกิน $1M ตามเงื่อนไข QuestPDF
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

try
{
    var builder = WebApplication.CreateBuilder(new WebApplicationOptions
    {
        Args = args,
        ContentRootPath = AppContext.BaseDirectory
    });

    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console());

    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
            opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();

    // ── Swagger ──────────────────────────────────────────────────────────────
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "TBG Assistant API", Version = "v1" });

        // XML doc comments
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);

        var scheme = new OpenApiSecurityScheme
        {
            Name         = "Authorization",
            Type         = SecuritySchemeType.Http,
            Scheme       = "bearer",
            BearerFormat = "JWT",
            In           = ParameterLocation.Header,
            Description  = "ใส่ JWT token ที่ได้จาก /auth/line หรือ /auth/login"
        };
        c.AddSecurityDefinition("Bearer", scheme);
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
    });

    // ── Data Protection ──────────────────────────────────────────────────────
    // ใช้เข้ารหัส preview token ตอนผูกบัญชี LINE — key ring ต้องอยู่นอกโฟลเดอร์ publish
    // ไม่งั้น deploy ทับแล้ว key หาย → token ที่ออกไปแล้วใช้ไม่ได้ทั้งหมด
    var dataProtection = builder.Services
        .AddDataProtection()
        .SetApplicationName("Hrms.LineLink");
    var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];
    if (string.IsNullOrWhiteSpace(dataProtectionKeysPath) && !builder.Environment.IsDevelopment())
    {
        // ถ้า config ยังไม่ได้ตั้ง (เช่น deploy แล้วลืมอัป appsettings) ให้ใช้ ProgramData เป็น default
        // แทนการ throw — ยังอยู่นอกโฟลเดอร์ publish ตามเจตนาเดิม แต่ไม่ทำให้ API startup พังทั้งตัว
        dataProtectionKeysPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "TBG Assistant", "DataProtectionKeys");
        Log.Warning(
            "DataProtection:KeysPath ไม่ได้ตั้งค่าใน environment {Environment} — ใช้ default path {KeysPath} " +
            "แนะนำให้ตั้งค่าใน appsettings.{Environment}.json ให้ชัดเจน",
            builder.Environment.EnvironmentName, dataProtectionKeysPath, builder.Environment.EnvironmentName);
    }

    if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
    {
        try
        {
            Directory.CreateDirectory(dataProtectionKeysPath);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"ไม่สามารถสร้าง/เข้าถึงโฟลเดอร์ DataProtection:KeysPath '{dataProtectionKeysPath}' ได้ " +
                "กรุณาสร้างโฟลเดอร์และให้สิทธิ์ write กับ identity ของ IIS App Pool", ex);
        }

        dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
        if (OperatingSystem.IsWindows())
            dataProtection.ProtectKeysWithDpapi(protectToLocalMachine: true);
    }

    builder.Services.AddApplicationServices();
    builder.Services.AddInfrastructureServices(builder.Configuration);

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddMemoryCache(); // ใช้เก็บ print token อายุสั้นของ Memo PDF
    builder.Services.AddScoped<ICurrentUser, CurrentUser>();
    builder.Services.AddScoped<IExternalCurrentUser, ExternalCurrentUser>();
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor |
            ForwardedHeaders.XForwardedProto |
            ForwardedHeaders.XForwardedHost;
    });

    // ── Health Checks ────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<HrmsDbContext>("db");

    // ── Response Compression (7.8) ───────────────────────────────────────────
    builder.Services.AddResponseCompression(opts => opts.EnableForHttps = true);

    // ── JWT Bearer ───────────────────────────────────────────────────────────
    var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
        ?? throw new InvalidOperationException("Jwt options not configured.");
    var externalJwt = builder.Configuration.GetSection(ExternalJwtOptions.SectionName).Get<ExternalJwtOptions>()
        ?? throw new InvalidOperationException("ExternalJwt options not configured.");

    JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwt.Issuer,
                ValidAudience = jwt.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                ClockSkew = TimeSpan.Zero,
                NameClaimType = JwtRegisteredClaimNames.Sub,
                RoleClaimType = System.Security.Claims.ClaimTypes.Role
            };

            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        traceId = context.HttpContext.TraceIdentifier,
                        error   = "UNAUTHORIZED",
                        message = "กรุณาเข้าสู่ระบบก่อนใช้งาน"
                    });
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = 403;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        traceId = context.HttpContext.TraceIdentifier,
                        error   = "FORBIDDEN",
                        message = "คุณไม่มีสิทธิ์ดำเนินการนี้"
                    });
                }
            };
        })
        .AddJwtBearer(ExternalAuthDefaults.Scheme, options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = externalJwt.Issuer,
                ValidAudience = externalJwt.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(externalJwt.Secret)),
                ClockSkew = TimeSpan.Zero,
                NameClaimType = JwtRegisteredClaimNames.Sub
            };
            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        traceId = context.HttpContext.TraceIdentifier,
                        error = "EXTERNAL_UNAUTHORIZED",
                        message = "กรุณาเข้าสู่ระบบผู้แจ้งภายนอกอีกครั้ง"
                    });
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        traceId = context.HttpContext.TraceIdentifier,
                        error = "EXTERNAL_FORBIDDEN",
                        message = "ไม่มีสิทธิ์เข้าถึงข้อมูลผู้แจ้งภายนอก"
                    });
                }
            };
        });

    builder.Services.AddAuthorization(opt =>
    {
        opt.AddPolicy(AuthPolicies.RequireHr,
            p => p.RequireRole("Hr", "Admin"));
        opt.AddPolicy(AuthPolicies.RequireSupervisor,
            p => p.RequireRole("Supervisor", "Hr", "Admin"));
        opt.AddPolicy(AuthPolicies.RequireAdmin,
            p => p.RequireRole("Admin"));
        opt.AddPolicy(AuthPolicies.RequireExecutive,
            p => p.RequireRole("Executive", "Admin"));
        opt.AddPolicy(ExternalAuthDefaults.Policy, policy => policy
            .AddAuthenticationSchemes(ExternalAuthDefaults.Scheme)
            .RequireAuthenticatedUser()
            .RequireClaim("actor_type", "external")
            .RequireClaim("external_reporter_id"));
    });
    builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
    builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

    builder.Services.AddCors(opt =>
    {
        opt.AddDefaultPolicy(p => p
            .WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod());
    });

    // ── Rate Limiter ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.OnRejected = async (context, ct) =>
        {
            var response = context.HttpContext.Response;
            response.ContentType = "application/json";

            var retryAfterSecs = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                ? (int)retryAfter.TotalSeconds : 60;

            response.Headers["Retry-After"] = retryAfterSecs.ToString();

            await response.WriteAsJsonAsync(new
            {
                traceId    = context.HttpContext.TraceIdentifier,
                error      = "RATE_LIMIT_EXCEEDED",
                message    = "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
                retryAfter = retryAfterSecs
            }, ct);
        };

        options.AddPolicy("default", context =>
        {
            var userId = context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (userId is not null)
            {
                return RateLimitPartition.GetFixedWindowLimiter($"user:{userId}", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 300,
                    Window      = TimeSpan.FromMinutes(1),
                    QueueLimit  = 0
                });
            }

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            // IP เดียวกันอาจมีผู้ใช้หลายคน (NAT ออฟฟิศ) — ครอบคลุมเฉพาะ request ก่อนล็อกอิน เช่น /auth/refresh
            return RateLimitPartition.GetFixedWindowLimiter($"ip:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window      = TimeSpan.FromMinutes(1),
                QueueLimit  = 0
            });
        });

        options.AddPolicy("auth_strict", context =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            // 5/นาที ต่อ IP ไม่พอเมื่อพนักงานทั้งออฟฟิศแชร์ IP เดียว (ล็อกอินพร้อมกันตอนเช้า)
            return RateLimitPartition.GetFixedWindowLimiter($"auth:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window      = TimeSpan.FromMinutes(1),
                QueueLimit  = 0
            });
        });

        options.AddPolicy("external_auth", context =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter($"external-auth:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
        });

        options.AddPolicy("external_create", context =>
        {
            var reporterId = context.User.FindFirst("external_reporter_id")?.Value;
            var partition = reporterId ?? $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
            return RateLimitPartition.GetFixedWindowLimiter($"external-create:{partition}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            });
        });

        options.AddPolicy("external_write", context =>
        {
            var reporterId = context.User.FindFirst("external_reporter_id")?.Value;
            var partition = reporterId ?? $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
            return RateLimitPartition.GetFixedWindowLimiter($"external-write:{partition}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            });
        });
    });

    // ── Build ─────────────────────────────────────────────────────────────────
    var app = builder.Build();
    var recurringJobRegistrar = app.Services.GetRequiredService<RecurringJobRegistrar>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseHangfireDashboard("/hangfire");

        // Recurring job — Daily attendance report to Executives (Thai 10:00 = UTC 03:00)
        recurringJobRegistrar.RegisterDevelopmentJobs();

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        await db.Database.MigrateAsync();
        await EnsureDevelopmentSchemaCompatibilityAsync(db);
        await scope.ServiceProvider.GetRequiredService<DataSeeder>().SeedAsync();
    }

    recurringJobRegistrar.RegisterProductionJobs();

    app.UseForwardedHeaders();
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments("/uploads/tickets"))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
        await next();
    });
    app.UseStaticFiles();
    app.UseResponseCompression();
    app.UseSerilogRequestLogging();
    app.UseMiddleware<CorrelationIdMiddleware>();
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseCors();
    app.UseAuthentication();
    // ต้องอยู่หลัง UseAuthentication ไม่งั้น context.User ว่างเสมอ →
    // ทุกคนตกลง partition ตาม IP ร่วมกัน (โดน 429 ทั้งออฟฟิศหลัง NAT เดียวกัน)
    app.UseRateLimiter();
    app.UseAuthorization();

    // Health check endpoints (ไม่ผ่าน rate limiter / auth)
    var jsonOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        Predicate = _ => false,   // liveness: ไม่รัน check ใดเลย — แค่ API ตอบสนองได้
        ResponseWriter = async (ctx, _) =>
        {
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { status = "Healthy" }, jsonOpts));
        }
    });
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        ResponseWriter = async (ctx, report) =>
        {
            ctx.Response.ContentType = "application/json";
            var result = new
            {
                status = report.Status.ToString(),
                checks = report.Entries.ToDictionary(
                    e => e.Key,
                    e => e.Value.Status.ToString())
            };
            ctx.Response.StatusCode = report.Status == HealthStatus.Healthy ? 200 : 503;
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(result, jsonOpts));
        }
    });

    app.MapControllers().RequireRateLimiting("default");

    app.Run();
}
catch (HostAbortedException)
{
    // EF Core tooling aborts the host after resolving services during design-time commands.
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application startup failed");
}
finally
{
    Log.CloseAndFlush();
}

static async Task EnsureDevelopmentSchemaCompatibilityAsync(HrmsDbContext db)
{
    await EnsureColumnAsync(db, "ticket_subjects", "created_by", "char(36) NULL");
    await EnsureColumnAsync(db, "ticket_subjects", "updated_by", "char(36) NULL");
}

static async Task EnsureColumnAsync(HrmsDbContext db, string tableName, string columnName, string columnDefinition)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State == System.Data.ConnectionState.Closed;
    if (shouldClose) await connection.OpenAsync();

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = @tableName
              AND COLUMN_NAME = @columnName
            """;

        var tableParam = command.CreateParameter();
        tableParam.ParameterName = "@tableName";
        tableParam.Value = tableName;
        command.Parameters.Add(tableParam);

        var columnParam = command.CreateParameter();
        columnParam.ParameterName = "@columnName";
        columnParam.Value = columnName;
        command.Parameters.Add(columnParam);

        var exists = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;
        if (exists) return;

        await db.Database.ExecuteSqlRawAsync(
            $"ALTER TABLE `{tableName}` ADD COLUMN `{columnName}` {columnDefinition}");
    }
    finally
    {
        if (shouldClose) await connection.CloseAsync();
    }
}
