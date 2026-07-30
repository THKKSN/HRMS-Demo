$ErrorActionPreference = 'Stop'

$containerName = 'hrms-ticket-e2e-mysql'
$connection = 'Server=127.0.0.1;Port=33307;Database=hrms_ticket_e2e;User=root;Password=hrms_e2e_root;CharSet=utf8mb4;AllowUserVariables=True;'
$docker = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
if (-not (Test-Path $docker)) {
    $docker = (Get-Command docker.exe -ErrorAction Stop).Source
}
$dotnetEf = Join-Path $env:USERPROFILE '.dotnet\tools\dotnet-ef.exe'
$dotnetBin = Join-Path $env:ProgramFiles 'dotnet'
$node = Join-Path $env:ProgramFiles 'nodejs\node.exe'
$npmBin = Join-Path $env:APPDATA 'npm'
$playwrightCli = (Resolve-Path 'node_modules\.pnpm\node_modules\playwright\cli.js').Path

function Remove-E2EContainer {
    $containerId = & $docker ps --all --quiet --filter "name=^/$containerName$"
    if ($containerId) {
        $null = & $docker rm -f $containerName
    }
}

try {
    Remove-E2EContainer
    $null = & $docker run --detach --rm `
        --name $containerName `
        --publish 33307:3306 `
        --env MYSQL_ROOT_PASSWORD=hrms_e2e_root `
        --env MYSQL_DATABASE=hrms_ticket_e2e `
        --env MYSQL_USER=hrms_e2e `
        --env MYSQL_PASSWORD=hrms_e2e_password `
        mysql:8.0 `
        --character-set-server=utf8mb4 `
        --collation-server=utf8mb4_unicode_ci

    Start-Sleep -Seconds 10
    $ready = $false
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $health = Start-Process -FilePath $docker -ArgumentList @(
            'exec',
            '--env',
            'MYSQL_PWD=hrms_e2e_root',
            $containerName,
            'mysql',
            '--user=root',
            '--execute=SELECT/**/1'
        ) -Wait -PassThru -NoNewWindow
        if ($health.ExitCode -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw 'MySQL E2E container did not become ready.'
    }

    $referenceSchemaPath = (Resolve-Path scripts/e2e-reference-schema.sql).Path
    $copySchema = Start-Process -FilePath $docker -ArgumentList @(
        'cp',
        $referenceSchemaPath,
        "${containerName}:/tmp/e2e-reference-schema.sql"
    ) -Wait -PassThru -NoNewWindow
    if ($copySchema.ExitCode -ne 0) {
        throw 'Copying E2E address reference schema failed.'
    }

    $importSchema = Start-Process -FilePath $docker -ArgumentList @(
        'exec',
        '--env',
        'MYSQL_PWD=hrms_e2e_root',
        $containerName,
        'mysql',
        '--user=root',
        'hrms_ticket_e2e',
        '--execute="source /tmp/e2e-reference-schema.sql"'
    ) -Wait -PassThru -NoNewWindow
    if ($importSchema.ExitCode -ne 0) {
        throw 'Creating E2E address reference schema failed.'
    }

    $migrate = Start-Process -FilePath $dotnetEf -ArgumentList @(
        'database',
        'update',
        '--project',
        'apps/api/Hrms.Infrastructure/Hrms.Infrastructure.csproj',
        '--startup-project',
        'apps/api/Hrms.Api/Hrms.Api.csproj',
        '--context',
        'HrmsDbContext',
        '--connection',
        $connection
    ) -Wait -PassThru -NoNewWindow
    if ($migrate.ExitCode -ne 0) {
        throw 'Applying E2E database migrations failed.'
    }

    $env:HRMS_E2E_DB_CONNECTION = $connection
    $env:PATH = "$dotnetBin;$(Split-Path $node);$npmBin;$env:PATH"
    $playwright = Start-Process -FilePath $node -ArgumentList @(
        $playwrightCli,
        'test',
        '--config',
        'playwright.real.config.ts'
    ) -Wait -PassThru -NoNewWindow
    if ($playwright.ExitCode -ne 0) {
        throw 'Real Ticket E2E failed.'
    }
}
finally {
    Remove-Item Env:HRMS_E2E_DB_CONNECTION -ErrorAction SilentlyContinue
    Remove-E2EContainer
}
