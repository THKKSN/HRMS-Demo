# Employee-Code Preview LINE Account Linking Design

**Date:** 2026-08-17

**Status:** Approved

**Supersedes:** `2026-08-17-national-id-only-line-link-design.md`

## Objective

Change the first-time employee LINE account-linking flow at `/auth/link` to use `EmployeeCode` instead of a Thai national ID. Before the system sends an OTP, it must show the matched employee's full name and require the user to confirm that the preview is their own identity. LINE OAuth and the existing six-digit OTP remain mandatory.

## Scope

This change covers only first-time employee account linking:

- replace the national-ID field with one employee-code field;
- verify the employee code through the API and show the matched full name;
- require an explicit “ใช่ นี่คือฉัน” confirmation before requesting an OTP;
- keep LINE access-token verification, OTP confirmation, HRMS token issuance, refresh tokens, `next` redirects, and later automatic LINE login unchanged;
- remove the national ID from the account-linking form and API contracts.

This change does not modify admin password login, external reporter authentication, employee import, OTP lifetime/storage, or the database schema.

## Chosen Approach

Use a two-step server-authoritative flow:

1. a preview request verifies the LINE access token and employee code, then returns the employee's full name and an opaque, short-lived preview token;
2. an OTP request verifies the LINE access token and preview token, rechecks the employee's current eligibility, and only then sends the OTP.

The preview token binds the previewed employee to the verified LINE user. The client never chooses an employee ID and cannot replace the employee code between preview and OTP confirmation.

## User Flow

1. The employee opens LIFF and reaches `/auth/link` during first-time linking.
2. LIFF initializes and requires LINE login when necessary.
3. The employee enters an employee code, up to the existing database limit of 50 characters, and presses “ตรวจสอบ”.
4. The client sends the LINE access token and trimmed employee code to the preview endpoint.
5. The API verifies the LINE token first and requires exactly one active, unlinked employee matching the employee code.
6. The page displays only the matched employee's full first and last name.
7. The employee chooses one of two actions:
   - “ใช่ นี่คือฉัน” submits the preview token and requests an OTP;
   - “ไม่ใช่ กลับไปแก้ไข” discards the preview and returns to the employee-code field.
8. After a successful OTP request, the client navigates to `/auth/otp` while preserving `next`.
9. The existing OTP confirmation endpoint binds `Employee.LineUserId` and returns HRMS access and refresh tokens.
10. Later visits continue to sign in through the linked LINE account without showing the preview.

## API Contracts

### Preview employee

Add `POST /v1/auth/link/preview` under the existing `auth_strict` rate limit.

Request:

```json
{
  "accessToken": "LINE access token",
  "employeeCode": "EMP001"
}
```

Successful response:

```json
{
  "fullName": "สมชาย ใจดี",
  "previewToken": "opaque protected value",
  "expiresIn": 300
}
```

The response must not include the employee ID, national ID, phone, email, department, company, or LINE user ID.

### Request OTP after confirmation

Change `POST /v1/auth/otp/request` to accept:

```json
{
  "accessToken": "LINE access token",
  "previewToken": "opaque protected value"
}
```

`employeeCode` and `nationalId` are absent from this request. The API derives the employee identity from the protected preview token and revalidates it against the current database state.

This is an intentional breaking change for the repository's LIFF client and API. Both must be deployed together.

## Employee Lookup Rules

- Trim leading and trailing whitespace before validation and lookup.
- Require a non-empty value of at most 50 characters.
- Compare against `Employee.EmployeeCode` using the database's configured equality semantics.
- Query only active employees and take at most two rows; proceed only when exactly one row matches.
- Recheck the protected employee ID, `IsActive`, and `LineUserId == null` when the OTP is requested. The unique database index prevents a new duplicate employee code from being introduced after preview.
- Treat missing, inactive, and ambiguous matches as the same generic verification failure.
- Preserve the existing `ALREADY_LINKED` behavior for an employee already linked to LINE.

The database already defines a unique index on `EmployeeCode`; the fail-closed duplicate check remains defense in depth for inconsistent or legacy data.

## Preview Token

Introduce a small server-side `ILinkPreviewTokenService` abstraction. The infrastructure implementation uses ASP.NET Core Data Protection with a dedicated purpose string and a five-minute lifetime.

The protected payload contains only:

- employee ID;
- verified LINE user ID;
- expiry enforced by the time-limited protector.

The token is opaque and tamper-resistant. When requesting an OTP, the API verifies the LINE access token again, unprotects the preview token, compares the current LINE user ID with the protected value, and reloads the employee before generating an OTP.

The normal UI disables the confirmation button while the request is pending so one click produces one request. The preview token is not promised to be globally one-time across deliberate HTTP replays; those requests remain constrained by `auth_strict`, and introducing durable replay storage is outside this no-migration change.

For multi-instance hosting, Data Protection keys must be shared by all instances. The current single IIS deployment may use its persistent local key ring, but ephemeral keys are not acceptable because a recycle would invalidate all outstanding previews unexpectedly.

## UI States

`/auth/link` has three explicit states:

1. **Employee code entry** — one input and a “ตรวจสอบ” button.
2. **Identity preview** — full name, “ใช่ นี่คือฉัน”, and “ไม่ใช่ กลับไปแก้ไข”. The employee-code input is no longer editable in this state.
3. **OTP transition** — loading state while requesting the OTP, followed by navigation to `/auth/otp`.

Returning to the entry state clears the preview name and token. Refreshing the page also clears all linking data. Employee code, full name, and preview token must not be stored in local storage, session storage, query strings, analytics, or application logs.

## Error Handling and Privacy

- Invalid or expired LINE token: preserve the existing unauthorized behavior.
- Empty or overlength employee code: reject locally and server-side without a lookup.
- Missing, inactive, or ambiguous employee: return one generic employee-verification error and no name.
- Already-linked employee: preserve `ALREADY_LINKED` and the current recovery behavior.
- Expired, malformed, tampered, or wrong-LINE preview token: return a generic preview-expired/invalid response and do not generate an OTP.
- Employee becomes inactive or linked after preview: reject the OTP request and require the user to restart.
- OTP delivery failure: do not bind the account; preserve the current API failure behavior.
- Invalid or expired OTP: preserve the current generic OTP response and do not bind the account.

Showing a full name to a caller who knows an employee code is an intentional product requirement. Exposure is reduced by requiring a verified LINE access token first, returning no other employee attributes, using the strict authentication rate limit, and never logging the request body or resolved identity.

## Component Changes

### API

- Add preview request/result contracts, validator, command, and handler.
- Add `ILinkPreviewTokenService` and a Data Protection implementation.
- Register persistent Data Protection and the preview-token service.
- Add the preview endpoint to `AuthController` with `auth_strict`.
- Replace `RequestOtpCommand.NationalId` with `PreviewToken`.
- Update `RequestOtpHandler` to verify LINE, validate the protected preview, reload the employee, and send OTP.
- Remove the Thai-national-ID validator from this flow; delete it only if no other code uses it.

### LIFF web

- Replace the national-ID form schema and field with `employeeCode`.
- Add preview and confirmation UI states.
- Add client functions for preview and confirmed OTP request payloads.
- Preserve LINE initialization, authentication recovery, OTP navigation, `next`, and linked-account handling.

### Documentation

- Mark the national-ID-only linking design and implementation plan as superseded.
- Update the current authentication-flow documentation to show employee code → name preview → confirmation → OTP.

## Testing

### API tests

- preview accepts a valid employee code for exactly one active, unlinked employee;
- LINE access token is verified before any employee query result is exposed;
- preview returns only full name, opaque token, and expiry;
- empty, overlength, missing, inactive, and ambiguous employee codes return no preview;
- already-linked behavior remains intact;
- a valid preview token bound to the same LINE user generates and sends an OTP;
- OTP is not generated by the preview request;
- expired, tampered, malformed, or wrong-LINE tokens never generate an OTP;
- employee eligibility is rechecked after preview;
- OTP confirmation still binds the verified LINE user and returns HRMS tokens;
- external reporter and admin authentication remain unaffected.

### LIFF tests

- the page renders only an employee-code field and no national-ID field;
- valid input shows the returned full name before OTP delivery;
- “ไม่ใช่” clears the preview and restores editable entry;
- “ใช่ นี่คือฉัน” submits the preview token once while the button is pending;
- successful confirmation navigates to `/auth/otp` with `next` preserved;
- preview and server errors remain on the linking page with no stale identity data;
- later LINE login bypasses the linking preview for linked employees.

## Deployment

- No database migration is required.
- API and LIFF artifacts must be deployed in the same release because both endpoint contracts change.
- Production must have a persistent Data Protection key ring accessible to the IIS application-pool identity before rollout.
- After deployment, verify preview, reject/cancel, OTP, final binding, and subsequent automatic LINE login on Production.
- Roll back API and LIFF together if the release fails; outstanding preview tokens may be discarded safely.

## Acceptance Criteria

- `/auth/link` asks for only an employee code during first-time linking.
- A verified LINE user sees the full name for exactly one matching active, unlinked employee.
- No OTP is sent until the user presses “ใช่ นี่คือฉัน”.
- The OTP request accepts a protected preview token rather than an employee code or national ID.
- Preview tokens expire after five minutes and cannot be used by another LINE identity.
- Correct OTP confirmation binds the LINE account and returns HRMS tokens.
- Subsequent LINE login remains automatic.
- National ID is absent from this linking flow.
- No database migration is introduced.
