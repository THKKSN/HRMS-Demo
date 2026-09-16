------------------------------------------------------------------------------
You may only use the Microsoft Visual Studio .NET/C/C++ Debugger (vsdbg) with
Visual Studio Code, Visual Studio or Visual Studio for Mac software to help you
develop and test your applications.
------------------------------------------------------------------------------
Exception: System.InvalidOperationException: Service IManagedEditAndContinueEngineRegistration is unavailable.
   at VsDbg.BrokeredServices.Services.BaseServiceSender.ThrowIfNull[TService](TService service)
   at VsDbg.BrokeredServices.Services.HotReloadServiceSender.<>c__DisplayClass6_0.<<-ctor>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at Microsoft.VisualStudio.Threading.AwaitExtensions.ExecuteContinuationSynchronouslyAwaiter`1.GetResult()
   at Microsoft.VisualStudio.Threading.AsyncLazy`1.<>c__DisplayClass20_0.<<GetValueAsync>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at VsDbg.BrokeredServices.Services.HotReloadServiceSender.<>c__DisplayClass11_0.<<OnProcessStarted>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at VsDbg.BrokeredServices.Services.BaseServiceSender.<>c__DisplayClass8_0.<<ExecuteEventInQueue>b__0>d.MoveNext()
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Private.CoreLib.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hrms.Api.dll'. Symbols loaded.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Step into: Stepping over non-user code 'Program.<Main>'
Step into: Stepping over non-user code 'Program.<Main>$'
Step into: Stepping over non-user code 'Program.<<Main>$>d__0..ctor'
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Diagnostics.HealthChecks.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Hosting.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.DependencyInjection.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.ComponentModel.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hrms.Infrastructure.dll'. Symbols loaded.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.EntityFrameworkCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hrms.Application.dll'. Symbols loaded.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hrms.Domain.dll'. Symbols loaded.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.EntityFrameworkCore.Relational.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Http.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Routing.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Features.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.HttpOverrides.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.StaticFiles.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.ResponseCompression.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.AspNetCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Cors.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.RateLimiting.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Authentication.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Authorization.Policy.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\System.Text.Json.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Diagnostics.HealthChecks.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.Core.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Logging.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Diagnostics.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Configuration.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Hosting.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Hosting.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Extensions.Hosting.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.ApiExplorer.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Swashbuckle.AspNetCore.SwaggerGen.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Configuration.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Http.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Options.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Diagnostics.HealthChecks.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Configuration.Binder.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\System.IdentityModel.Tokens.Jwt.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.IdentityModel.Tokens.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Xml.ReaderWriter.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Private.Xml.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Security.Claims.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.AspNetCore.Authentication.JwtBearer.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Authorization.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Swashbuckle.AspNetCore.Swagger.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Swashbuckle.AspNetCore.SwaggerUI.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hangfire.AspNetCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hangfire.Core.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Sinks.Console.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Collections.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Console.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.InteropServices.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Linq.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Private.Uri.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Hosting.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Threading.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Configuration.EnvironmentVariables.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.FileProviders.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.FileProviders.Physical.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Configuration.FileExtensions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Logging.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Diagnostics.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\System.Diagnostics.DiagnosticSource.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Configuration.Json.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Memory.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.IO.FileSystem.Watcher.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.ComponentModel.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Collections.Concurrent.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Threading.Overlapped.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\Microsoft.Win32.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Text.Encoding.Extensions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\System.IO.Pipelines.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Configuration.UserSecrets.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Logging.EventLog.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Logging.Configuration.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Options.ConfigurationExtensions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Logging.Console.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Logging.Debug.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Logging.EventSource.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Diagnostics.Tracing.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.DependencyInjection.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.Kestrel.Core.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.Kestrel.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.Kestrel.Transport.NamedPipes.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.Quic.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.Sockets.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\Microsoft.Win32.Registry.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.IIS.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.IISIntegration.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.FileProviders.Composite.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\System.Text.Encodings.Web.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Numerics.Vectors.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Connections.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Server.Kestrel.Transport.Sockets.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Hosting.Server.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.ObjectPool.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.HostFiltering.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Routing.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.ObjectModel.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Extensions.Logging.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.Loader.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.AspNetCore.OpenApi.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Authentication.Core.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Authentication.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.Cors.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.DataAnnotations.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.OpenApi.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\MediatR.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\FluentValidation.DependencyInjectionExtensions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\netstandard.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\FluentValidation.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\MediatR.Contracts.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Linq.Expressions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Pomelo.EntityFrameworkCore.MySql.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Caching.Memory.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Http.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.Http.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\MySqlConnector.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Data.Common.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.ComponentModel.TypeConverter.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hangfire.NetCore.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.Caching.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Collections.Immutable.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Text.RegularExpressions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.IdentityModel.JsonWebTokens.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.DataProtection.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.DataProtection.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Cryptography.Internal.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.WebEncoders.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.Extensions.Localization.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Mvc.Razor.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\8.0.24\Microsoft.AspNetCore.Http.Extensions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Settings.Configuration.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.Extensions.DependencyModel.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Reflection.Metadata.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.IO.MemoryMappedFiles.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Formatting.Compact.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Sinks.Debug.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Serilog.Sinks.File.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Threading.ThreadPool.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Threading.Thread.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Hangfire.MySql.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Transactions.Local.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Reflection.Emit.Lightweight.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Reflection.Emit.ILGeneration.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Reflection.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Newtonsoft.Json.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.Serialization.Formatters.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.Security.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.NameResolution.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.Intrinsics.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Security.Cryptography.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Dapper.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Xml.XDocument.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Private.Xml.Linq.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\runtimes\win\lib\netstandard2.0\System.Data.SqlClient.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
[11:13:50 INF] DB tables already exist. Exit install
[11:13:50 INF] DB tables already exist. Exit install
Hrms.Api.dll (31156): Loaded 'Anonymously Hosted DynamicMethods Assembly'.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.Numerics.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Runtime.Serialization.Primitives.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Diagnostics.TraceSource.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\EFCore.NamingConventions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\bin\Debug\net8.0\Microsoft.EntityFrameworkCore.Abstractions.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.ComponentModel.Annotations.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Net.NetworkInformation.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
[11:13:56 WRN] The 'WorkDayFlags' property 'WorkDays' on entity type 'Company' is configured with a database-generated default, but has no configured sentinel value. The database-generated default will always be used for inserts when the property has the value 'None', since this is the CLR default for the 'WorkDayFlags' type. Consider using a nullable type, using a nullable backing field, or setting the sentinel value for the property to ensure the database default is used when, and only when, appropriate. See https://aka.ms/efcore-docs-default-values for more information.
[11:13:56 WRN] The 'WorkDayFlags' property 'WorkDays' on entity type 'Company' is configured with a database-generated default, but has no configured sentinel value. The database-generated default will always be used for inserts when the property has the value 'None', since this is the CLR default for the 'WorkDayFlags' type. Consider using a nullable type, using a nullable backing field, or setting the sentinel value for the property to ensure the database default is used when, and only when, appropriate. See https://aka.ms/efcore-docs-default-values for more information.
[11:13:57 INF] Executed DbCommand (56ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='db_hrms' AND TABLE_NAME='__EFMigrationsHistory';
[11:13:57 INF] Executed DbCommand (56ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='db_hrms' AND TABLE_NAME='__EFMigrationsHistory';
[11:13:57 INF] Executed DbCommand (9ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='db_hrms' AND TABLE_NAME='__EFMigrationsHistory';
[11:13:57 INF] Executed DbCommand (9ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='db_hrms' AND TABLE_NAME='__EFMigrationsHistory';
[11:13:57 INF] Executed DbCommand (28ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT `migration_id`, `product_version`
FROM `__EFMigrationsHistory`
ORDER BY `migration_id`;
[11:13:57 INF] Executed DbCommand (28ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
SELECT `migration_id`, `product_version`
FROM `__EFMigrationsHistory`
ORDER BY `migration_id`;
[11:13:57 ERR] Failed executing DbCommand (34ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
CREATE TABLE `locations` (
    `id` char(36) COLLATE ascii_general_ci NOT NULL,
    `company_id` char(36) COLLATE ascii_general_ci NOT NULL,
    `name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `latitude` double NOT NULL,
    `longitude` double NOT NULL,
    `radius_meters` int NOT NULL,
    `province_id` int NULL,
    `district_id` int NULL,
    `sub_district_id` int NULL,
    `address` varchar(500) CHARACTER SET utf8mb4 NULL,
    `is_active` tinyint(1) NOT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `created_by` char(36) COLLATE ascii_general_ci NULL,
    `updated_by` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `pk_locations` PRIMARY KEY (`id`),
    CONSTRAINT `fk_locations_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_locations_districts_district_id` FOREIGN KEY (`district_id`) REFERENCES `district` (`DISTRICT_ID`),
    CONSTRAINT `fk_locations_provinces_province_id` FOREIGN KEY (`province_id`) REFERENCES `provinces` (`PROVINCE_ID`),
    CONSTRAINT `fk_locations_sub_districts_sub_district_id` FOREIGN KEY (`sub_district_id`) REFERENCES `subdistrict` (`SUB_DISTRICT_ID`)
) CHARACTER SET=utf8mb4;
[11:13:57 ERR] Failed executing DbCommand (34ms) [Parameters=[], CommandType='Text', CommandTimeout='30']
CREATE TABLE `locations` (
    `id` char(36) COLLATE ascii_general_ci NOT NULL,
    `company_id` char(36) COLLATE ascii_general_ci NOT NULL,
    `name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `latitude` double NOT NULL,
    `longitude` double NOT NULL,
    `radius_meters` int NOT NULL,
    `province_id` int NULL,
    `district_id` int NULL,
    `sub_district_id` int NULL,
    `address` varchar(500) CHARACTER SET utf8mb4 NULL,
    `is_active` tinyint(1) NOT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    `created_by` char(36) COLLATE ascii_general_ci NULL,
    `updated_by` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `pk_locations` PRIMARY KEY (`id`),
    CONSTRAINT `fk_locations_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_locations_districts_district_id` FOREIGN KEY (`district_id`) REFERENCES `district` (`DISTRICT_ID`),
    CONSTRAINT `fk_locations_provinces_province_id` FOREIGN KEY (`province_id`) REFERENCES `provinces` (`PROVINCE_ID`),
    CONSTRAINT `fk_locations_sub_districts_sub_district_id` FOREIGN KEY (`sub_district_id`) REFERENCES `subdistrict` (`SUB_DISTRICT_ID`)
) CHARACTER SET=utf8mb4;
Exception thrown: 'MySqlConnector.MySqlException' in System.Private.CoreLib.dll
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.Diagnostics.StackTrace.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
Hrms.Api.dll (31156): Loaded 'C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.24\System.IO.Compression.dll'. Skipped loading symbols. Module is optimized and the debugger option 'Just My Code' is enabled.
[11:13:58 FTL] Application startup failed
MySqlConnector.MySqlException (0x80004005): Table 'locations' already exists
   at MySqlConnector.Core.ServerSession.ReceiveReplyAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/ServerSession.cs:line 894
   at MySqlConnector.Core.ResultSet.ReadResultSetHeaderAsync(IOBehavior ioBehavior) in /_/src/MySqlConnector/Core/ResultSet.cs:line 37
   at MySqlConnector.MySqlDataReader.ActivateResultSet(CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 130
   at MySqlConnector.MySqlDataReader.InitAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, IDictionary`2 cachedProcedures, IMySqlCommand command, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 483
   at MySqlConnector.Core.CommandExecutor.ExecuteReaderAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/CommandExecutor.cs:line 56
   at MySqlConnector.MySqlCommand.ExecuteNonQueryAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 309
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.Migrator.MigrateAsync(String targetMigration, CancellationToken cancellationToken)
   at Program.<Main>$(String[] args) in C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\Program.cs:line 328
[11:13:58 FTL] Application startup failed
MySqlConnector.MySqlException (0x80004005): Table 'locations' already exists
   at MySqlConnector.Core.ServerSession.ReceiveReplyAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/ServerSession.cs:line 894
   at MySqlConnector.Core.ResultSet.ReadResultSetHeaderAsync(IOBehavior ioBehavior) in /_/src/MySqlConnector/Core/ResultSet.cs:line 37
   at MySqlConnector.MySqlDataReader.ActivateResultSet(CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 130
   at MySqlConnector.MySqlDataReader.InitAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, IDictionary`2 cachedProcedures, IMySqlCommand command, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlDataReader.cs:line 483
   at MySqlConnector.Core.CommandExecutor.ExecuteReaderAsync(CommandListPosition commandListPosition, ICommandPayloadCreator payloadCreator, CommandBehavior behavior, Activity activity, IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/Core/CommandExecutor.cs:line 56
   at MySqlConnector.MySqlCommand.ExecuteNonQueryAsync(IOBehavior ioBehavior, CancellationToken cancellationToken) in /_/src/MySqlConnector/MySqlCommand.cs:line 309
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Storage.RelationalCommand.ExecuteNonQueryAsync(RelationalCommandParameterObject parameterObject, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.MigrationCommandExecutor.ExecuteNonQueryAsync(IEnumerable`1 migrationCommands, IRelationalConnection connection, CancellationToken cancellationToken)
   at Microsoft.EntityFrameworkCore.Migrations.Internal.Migrator.MigrateAsync(String targetMigration, CancellationToken cancellationToken)
   at Program.<Main>$(String[] args) in C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF\apps\api\Hrms.Api\Program.cs:line 328
The program '[31156] Hrms.Api.dll' has exited with code 0 (0x0).
