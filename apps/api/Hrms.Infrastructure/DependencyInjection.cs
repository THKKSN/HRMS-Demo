using System.Transactions;
using Hangfire;
using Hangfire.MySql;
using Hrms.Application.Common.Interfaces;
using Hrms.Infrastructure.Jobs;
using Hrms.Application.Common.Options;
using Hrms.Infrastructure.Persistence;
using Hrms.Infrastructure.Services;
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

        services.AddStackExchangeRedisCache(opt =>
        {
            opt.Configuration = configuration.GetConnectionString("Redis");
        });

        // Options
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<LineOptions>(configuration.GetSection(LineOptions.SectionName));

        // Seeder
        services.AddScoped<DataSeeder>();
        services.AddScoped<PermissionSeeder>();

        // Services
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IWorkingDayCalculator, WorkingDayCalculator>();
        services.AddHttpClient<ILineAuthService, LineAuthService>();
        services.AddHttpClient<ILineMessagingService, LineMessagingService>();
        services.AddScoped<ILineWebhookService, LineWebhookService>();
        services.AddScoped<ILeaveNotificationService, HangfireLeaveNotificationService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<ITicketNumberGenerator, TicketNumberGenerator>();
        services.AddScoped<IShiftResolver, ShiftResolverService>();
        services.AddScoped<DailyAttendanceReportJob>();
        services.AddScoped<TicketUploadCleanupJob>();
        services.AddScoped<NotificationDeliveryJob>();
        services.AddSingleton<IGeofenceService, GeofenceService>();

        var hangfireConnectionString = new MySqlConnector.MySqlConnectionStringBuilder(connectionString)
        {
            AllowUserVariables = true
        }.ConnectionString;

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseStorage(new MySqlStorage(
                hangfireConnectionString,
                new MySqlStorageOptions
                {
                    TransactionIsolationLevel = IsolationLevel.ReadCommitted,
                    QueuePollInterval = TimeSpan.FromSeconds(15),
                    JobExpirationCheckInterval = TimeSpan.FromHours(1),
                    CountersAggregateInterval = TimeSpan.FromMinutes(5),
                    PrepareSchemaIfNecessary = true,
                    DashboardJobListLimit = 50_000,
                    TransactionTimeout = TimeSpan.FromMinutes(1),
                    TablesPrefix = "hangfire"
                })));

        if (configuration.GetValue("Hangfire:ServerEnabled", true))
            services.AddHangfireServer();

        return services;
    }
}
