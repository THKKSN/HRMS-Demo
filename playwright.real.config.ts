import { defineConfig } from '@playwright/test'

const apiUrl = 'http://localhost:5135'
const connectionString = process.env.HRMS_E2E_DB_CONNECTION
const dotnet = '"C:\\Program Files\\dotnet\\dotnet.exe"'
const node = '"C:\\Program Files\\nodejs\\node.exe"'
const next = '"node_modules\\next\\dist\\bin\\next"'

if (!connectionString) {
  throw new Error('HRMS_E2E_DB_CONNECTION is required. Run scripts/run-ticket-real-e2e.ps1.')
}

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 240_000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'ticket-real-chromium',
    use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
  }],
  webServer: [
    {
      command: `${dotnet} run --project apps/api/Hrms.Api/Hrms.Api.csproj --no-launch-profile --urls http://localhost:5135`,
      url: `${apiUrl}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: connectionString,
        ConnectionStrings__Redis: 'localhost:6379',
        Hangfire__ServerEnabled: 'false',
        Jwt__Secret: 'HRMS-E2E-only-secret-key-at-least-32-characters-long',
        Jwt__Issuer: 'hrms-api',
        Jwt__Audience: 'hrms-client',
        AllowedOrigins__0: 'http://localhost:3000',
        AllowedOrigins__1: 'http://localhost:3001',
      },
    },
    {
      command: `${node} ${next} build && ${node} ${next} start --port 3000`,
      cwd: 'apps/liff-web',
      url: 'http://localhost:3000/tickets/new',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_URL: `${apiUrl}/v1`,
        NEXT_PUBLIC_LIFF_ID: '',
        NEXT_PUBLIC_E2E_AUTH_BYPASS: 'true',
      },
    },
    {
      command: `${node} ${next} build && ${node} ${next} start --port 3001`,
      cwd: 'apps/admin-web',
      url: 'http://localhost:3001/login',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_URL: `${apiUrl}/v1`,
      },
    },
  ],
})
