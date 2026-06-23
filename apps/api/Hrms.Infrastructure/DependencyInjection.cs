using Hangfire;
using Hangfire.InMemory;
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

        // Services
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IWorkingDayCalculator, WorkingDayCalculator>();
        services.AddHttpClient<ILineAuthService, LineAuthService>();
        services.AddHttpClient<ILineMessagingService, LineMessagingService>();
        services.AddScoped<ILineWebhookService, LineWebhookService>();
        services.AddScoped<ILeaveNotificationService, HangfireLeaveNotificationService>();
        services.AddSingleton<IGeofenceService, GeofenceService>();

        // Hangfire (InMemory — swap to MySqlStorage for production)
        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseInMemoryStorage());
        services.AddHangfireServer();

        return services;
    }
}
