using System.Transactions;
using Hangfire;
using Hangfire.MySql;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Jobs;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
using MediatR;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hrms.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        var serverVersion = new MySqlServerVersion(new Version(8, 0, 0));

        services.AddDbContext<HrmsDbContext>(opt =>
            opt.UseMySql(
                connectionString,
                serverVersion,
                x => x.MigrationsAssembly(typeof(HrmsDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention());

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<HrmsDbContext>());
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        services.AddDistributedMemoryCache();

        // Options
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<ExternalJwtOptions>(configuration.GetSection(ExternalJwtOptions.SectionName));
        services.Configure<LineOptions>(configuration.GetSection(LineOptions.SectionName));
        services.Configure<ExpenseOcrOptions>(configuration.GetSection(ExpenseOcrOptions.SectionName));
        services.Configure<PiswinOptions>(configuration.GetSection(PiswinOptions.SectionName));
        services.Configure<ExternalRepairSyncOptions>(configuration.GetSection(ExternalRepairSyncOptions.SectionName));

        // Seeder
        services.AddScoped<DataSeeder>();
        services.AddScoped<PermissionSeeder>();

        // Services
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IExternalTokenService, ExternalTokenService>();
        services.AddScoped<IOtpService, OtpService>();
        // preview token อายุ 5 นาที — ตรงกับ TTL ของ OTP
        services.AddSingleton<ILinkPreviewTokenService>(provider =>
            new LinkPreviewTokenService(
                provider.GetRequiredService<IDataProtectionProvider>(),
                TimeSpan.FromMinutes(5)));
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IWorkingDayCalculator, WorkingDayCalculator>();
        services.AddHttpClient<ILineAuthService, LineAuthService>();
        services.AddHttpClient<ILineMessagingService, LineMessagingService>();
        services.AddScoped<ILineWebhookService, LineWebhookService>();
        services.AddScoped<ILeaveNotificationService, HangfireLeaveNotificationService>();
        services.AddScoped<INotificationDispatchSignal, HangfireNotificationDispatchSignal>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IExpenseOcrQueue, HangfireExpenseOcrQueue>();
        services.AddHttpClient<IExpenseOcrEngine, HttpExpenseOcrEngine>();
        services.AddHttpClient<IPiswinEmployeeClient, PiswinEmployeeClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PiswinOptions>>().Value;
            client.Timeout = TimeSpan.FromSeconds(Math.Max(1, options.TimeoutSeconds));
        });
        services.AddHttpClient<IExternalRepairSyncClient, ExternalRepairSyncClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<ExternalRepairSyncOptions>>().Value;
            client.Timeout = TimeSpan.FromSeconds(Math.Max(1, options.TimeoutSeconds));
        });
        services.AddScoped<ITicketNumberGenerator, TicketNumberGenerator>();
        services.AddScoped<IShiftResolver, ShiftResolverService>();
        services.AddScoped<DailyAttendanceReportJob>();
        services.AddScoped<TicketUploadCleanupJob>();
        services.AddScoped<NotificationDeliveryJob>();
        services.AddScoped<ExternalRepairSyncDeliveryJob>();
        services.AddScoped<ExpenseOcrJob>();
        services.AddScoped<TicketAutoConfirmationJob>();
        services.AddSingleton<RecurringJobRegistrar>();
        services.AddSingleton<IGeofenceService, GeofenceService>();

        var hangfireConnectionString = new MySqlConnector.MySqlConnectionStringBuilder(connectionString)
        {
            AllowUserVariables = true
        }.ConnectionString;
        var hangfireTablesPrefix = configuration.GetValue<string>("Hangfire:TablesPrefix") ?? "hangfire";

        // MySqlStorage เป็น polling-based ไม่มี long-polling ค่านี้จึงเป็นดีเลย์ตรง ๆ
        // ระหว่าง "job ถูก enqueue" กับ "worker หยิบไปทำ" (วัดได้เฉลี่ย 9.6s ที่ค่า 15s)
        var queuePollIntervalSeconds = Math.Clamp(
            configuration.GetValue<int?>("Hangfire:QueuePollIntervalSeconds") ?? 2, 1, 60);

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseStorage(new MySqlStorage(
                hangfireConnectionString,
                new MySqlStorageOptions
                {
                    TransactionIsolationLevel = IsolationLevel.ReadCommitted,
                    QueuePollInterval = TimeSpan.FromSeconds(queuePollIntervalSeconds),
                    JobExpirationCheckInterval = TimeSpan.FromHours(1),
                    CountersAggregateInterval = TimeSpan.FromMinutes(5),
                    PrepareSchemaIfNecessary = true,
                    DashboardJobListLimit = 50_000,
                    TransactionTimeout = TimeSpan.FromMinutes(1),
                    TablesPrefix = hangfireTablesPrefix
                })));

        if (configuration.GetValue("Hangfire:ServerEnabled", true))
        {
            services.AddHangfireServer(options =>
            {
                var queues = configuration.GetSection("Hangfire:Queues").Get<string[]>()
                    ?? ["default"];
                options.Queues = queues
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim().ToLowerInvariant())
                    .DefaultIfEmpty("default")
                    .ToArray();

                var workerCount = configuration.GetValue<int?>("Hangfire:WorkerCount");
                if (workerCount is > 0)
                    options.WorkerCount = workerCount.Value;
            });
        }

        return services;
    }
}
