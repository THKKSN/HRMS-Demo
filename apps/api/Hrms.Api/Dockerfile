FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Hrms.Api/Hrms.Api.csproj", "Hrms.Api/"]
COPY ["Hrms.Application/Hrms.Application.csproj", "Hrms.Application/"]
COPY ["Hrms.Domain/Hrms.Domain.csproj", "Hrms.Domain/"]
COPY ["Hrms.Infrastructure/Hrms.Infrastructure.csproj", "Hrms.Infrastructure/"]
RUN dotnet restore "Hrms.Api/Hrms.Api.csproj"
COPY . .
WORKDIR "/src/Hrms.Api"
RUN dotnet build "Hrms.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Hrms.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Hrms.Api.dll"]
