using FluentValidation;
using Hrms.Application.Common.Behaviours;
using Hrms.Application.Common.Interfaces;
using Hrms.Application.Common.Services;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Hrms.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IScopeGuard, ScopeGuard>();

        return services;
    }
}
