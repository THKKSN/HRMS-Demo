using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hrms.Api.Authorization;
using Hrms.Api.HealthChecks;
using Hrms.Api.Middleware;
using Hrms.Api.Services;
using Hrms.Application;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure;
using Hrms.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text.Json;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

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
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "HRMS API", Version = "v1" });

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

    builder.Services.AddApplicationServices();
    builder.Services.AddInfrastructureServices(builder.Configuration);

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUser, CurrentUser>();

    // ── Health Checks ────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<HrmsDbContext>("db")
        .AddCheck<RedisHealthCheck>("redis");

    // ── Response Compression (7.8) ───────────────────────────────────────────
    builder.Services.AddResponseCompression(opts => opts.EnableForHttps = true);

    // ── JWT Bearer ───────────────────────────────────────────────────────────
    var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
        ?? throw new InvalidOperationException("Jwt options not configured.");

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
    });

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
                    PermitLimit = 100,
                    Window      = TimeSpan.FromMinutes(1),
                    QueueLimit  = 0
                });
            }

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter($"ip:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window      = TimeSpan.FromMinutes(1),
                QueueLimit  = 0
            });
        });

        options.AddPolicy("auth_strict", context =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter($"auth:{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window      = TimeSpan.FromMinutes(1),
                QueueLimit  = 0
            });
        });
    });

    // ── Build ─────────────────────────────────────────────────────────────────
    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseHangfireDashboard("/hangfire");

        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<DataSeeder>().SeedAsync();
    }

    app.UseResponseCompression();
    app.UseSerilogRequestLogging();
    app.UseMiddleware<CorrelationIdMiddleware>();
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseCors();
    app.UseRateLimiter();
    app.UseAuthentication();
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
catch (Exception ex)
{
    Log.Fatal(ex, "Application startup failed");
}
finally
{
    Log.CloseAndFlush();
}
