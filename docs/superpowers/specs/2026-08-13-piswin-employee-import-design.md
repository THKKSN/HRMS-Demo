# PISWIN Employee Import Design

## Goal

Allow an authenticated Admin to search one employee by Thai national ID in the PISWIN HRMS API, review a safe preview, select a local company, and explicitly import that employee into HRMS.

## Scope

This first version imports one employee at a time. It does not provide batch synchronization, automatic updates of existing employees, department mapping, external company mapping, or storage of the PISWIN response.

## Decisions

- The frontend never calls PISWIN directly and never supplies SQL.
- The backend queries PISWIN again when import is confirmed. Preview state is not stored in the database or tokenized.
- Only users with the Admin role may preview or import an external employee.
- The local company is selected from `GET /v1/companies`; the frontend submits its local `companyId` at import time. If exactly one accessible active company exists, the frontend may select it automatically.
- `EmployeeCode` is PISWIN `ID`, converted to its invariant string form. It is not `Emp_Code`.
- A new employee gets the local Employee role, no password, no department, and can link their account through the existing LINE first-login flow using their employee code and national ID.
- An employee is considered already imported when either local `EmployeeCode` equals PISWIN `ID` or local `NationalId` equals PISWIN `Id_Card`. The first version returns a conflict and never overwrites existing data.
- The integration retains only fields needed by the local Employee model. It does not persist PISWIN raw JSON, salary, bank, tax, social-security, or other payroll data.

## Architecture

Add an Admin-only `EmployeeImportController` under the existing `v1` API. The controller dispatches MediatR requests that depend on a small application-facing `IPiswinEmployeeClient` interface. Infrastructure implements that client with the existing typed `HttpClient` registration pattern and reads its endpoint behavior from a `PiswinOptions` configuration section.

The PISWIN client owns only source communication and conversion of its dynamic `columns` and `rows` payload to a narrow `PiswinEmployee` model. Application handlers own authorization, input validation, company access, duplicate detection, Employee construction, Employee-role creation, and audit logging. This keeps the external API format from leaking into controllers or domain entities.

```text
Admin frontend
  -> HRMS API: preview/import with nationalId (+ companyId on import)
  -> Application handler: validate, authorize, read local data
  -> PISWIN client: build fixed national-ID query and POST to PISWIN
  -> Application handler: map allowed fields and persist local Employee
```

## PISWIN Client

`PiswinOptions` contains:

- `Endpoint`: the full PISWIN query endpoint.
- `DepartmentCode`: request `deptCode`; default is an empty string.
- `Year`: request `strYear`; default is `0`.
- `TimeoutSeconds`: HTTP timeout; default is `15`.

The typed client sends the source API's required payload:

```json
{
  "strSQL": "select * from employee where Id_Card = '1103703466623'",
  "deptCode": "",
  "strYear": 0
}
```

It accepts only a 13-digit national ID before composing the query. The value is digits-only, so no client-controlled SQL fragment can enter `strSQL`. The source endpoint is currently HTTP; it is called server-to-server only and must be reachable from the VM. The endpoint itself stays configuration-only and is not exposed in API responses.

The source response has `columns` and `rows`. The client reads values by column name from the first row and requires these fields:

| PISWIN field | Required | Local use |
| --- | --- | --- |
| `ID` | yes | `EmployeeCode` |
| `First_Name` | yes | `FirstName` |
| `Last_Name` | yes | `LastName` |
| `Id_Card` | yes | `NationalId` and identity confirmation |
| `Start_Working_Date` | no | `HireDate` |
| `Active` | no | `IsActive`, defaults to `true` when absent |

`ID`, names, and `Id_Card` must be non-empty. `Id_Card` must equal the requested national ID. Date parsing accepts ISO 8601 and `MM/dd/yyyy`; a non-empty invalid date makes the source data invalid. The source may return no rows, which is a normal not-found result. Multiple rows for one national ID are invalid source data.

## API Contract

Both endpoints require `[Authorize(Policy = AuthPolicies.RequireAdmin)]`.

### Preview

`POST /v1/employee-imports/preview`

Request:

```json
{
  "nationalId": "1103703466623"
}
```

The handler validates exactly 13 ASCII digits, loads the PISWIN employee, and reports whether either duplicate condition exists locally. It returns no financial fields and masks the national ID.

```json
{
  "employeeCode": "9905",
  "firstName": "ฐากร",
  "lastName": "คำสิงห์นอก",
  "nationalIdMasked": "1********6623",
  "hireDate": "2025-03-17",
  "isActive": true,
  "alreadyImported": false
}
```

### Import

`POST /v1/employee-imports`

Request:

```json
{
  "nationalId": "1103703466623",
  "companyId": "<local-company-guid>"
}
```

The handler validates the national ID, confirms the authenticated Admin may access the supplied company, requires that company to be active, then requests PISWIN anew. It verifies that no employee exists with the PISWIN `ID` or `Id_Card`, resolves the local Employee system role, creates the Employee and active EmployeeRole in one database transaction, then writes an audit log. The audit event contains employee code, company ID, and the imported field names, but never a full national ID or source response.

Success returns `201 Created` with the existing `EmployeeDetailDto` response and a Location pointing to `GET /v1/employees/{id}`.

The imported entity has:

- `CompanyId`: request `companyId`
- `DepartmentId`: `null`
- `EmployeeCode`: source `ID`
- `FirstName`: source `First_Name`
- `LastName`: source `Last_Name`
- `NationalId`: source `Id_Card`
- `HireDate`: parsed `Start_Working_Date`, if supplied
- `IsActive`: source `Active`, or `true` if omitted
- `PasswordHash`: `null`
- Role: active local Employee role scoped to the selected company

## Errors

The existing global exception middleware should translate source and application failures into the following response codes and stable error names:

| Condition | HTTP | Error |
| --- | --- | --- |
| national ID is not exactly 13 digits | 400 | `VALIDATION_ERROR` |
| caller is not an Admin | 403 | existing authorization response |
| PISWIN returns no employee | 404 | `EXTERNAL_EMPLOYEE_NOT_FOUND` |
| company absent, inactive, or outside the caller's scope | 404 or 403 | `COMPANY_NOT_FOUND` or existing forbidden response |
| employee code or national ID exists locally | 409 | `DUPLICATE_EMPLOYEE` |
| source payload has missing fields, multiple rows, mismatched ID, or invalid date | 422 | `EXTERNAL_DATA_INVALID` |
| PISWIN fails or returns non-success | 502 | `EXTERNAL_SERVICE_UNAVAILABLE` |
| PISWIN times out | 504 | `EXTERNAL_SERVICE_TIMEOUT` |

No response or log includes source SQL, raw source body, credentials, salary, bank data, or a full national ID.

## Configuration and Deployment

`Piswin` settings are read via standard .NET configuration and overridden on the VM with environment variables such as `Piswin__Endpoint` and `Piswin__TimeoutSeconds`. Production configuration uses `ASPNETCORE_ENVIRONMENT=Production`; `appsettings.Development.json` is not used on the VM. The VM must have outbound network access to the PISWIN host. The source uses HTTP, so network access should be restricted to the source host/VPN where possible.

## Testing

Tests cover the client mapping and application handlers without calling PISWIN:

- valid `columns`/`rows` maps expected allowed fields and parses both date formats;
- no rows maps to not found;
- invalid/ambiguous source payloads produce invalid-source errors;
- preview reports existing local employee without exposing a full national ID;
- import creates Employee plus EmployeeRole, has no password or department, and records a sanitized audit log;
- import rejects invalid ID, inaccessible/inactive company, duplicate code, and duplicate national ID;
- client transport errors map to unavailable/timeout errors;
- controller endpoints require Admin authorization and pass only the intended request values.

## Out of Scope

- Batch import or scheduled synchronization
- Updating local employees from PISWIN
- Department, position, company-code, or payroll mapping
- Persisting source response, salary, bank, tax, social-security, or other PISWIN columns
- UI implementation beyond consuming the stated backend endpoints
