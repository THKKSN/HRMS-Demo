# National-ID-Only LINE Account Linking Design

**Date:** 2026-08-17
**Status:** Approved

## Objective

Simplify the employee account-linking screen at `/auth/link` so an employee enters only a Thai national ID. LINE OAuth and the existing six-digit OTP confirmation remain mandatory. Subsequent visits continue to sign in automatically through the LINE account that was linked.

## Scope

This change covers the employee LIFF account-linking flow:

- remove the employee-code field from `/auth/link`;
- change `POST /v1/auth/otp/request` to accept `accessToken` and `nationalId` only;
- validate the national ID on both the client and server;
- find the active employee by national ID alone;
- keep LINE token verification, OTP delivery, OTP confirmation, JWT issuance, refresh tokens, and normal LINE login unchanged.

It does not change admin password login, external ticket authentication, employee import, OTP storage or lifetime, or the database schema.

## Chosen Approach

The approved approach is national ID plus two independent proofs:

1. a valid LINE access token identifies the LINE account;
2. a valid OTP delivered to that LINE account confirms possession before binding it to the employee.

The national ID is an employee lookup key, not a password. A national-ID-only flow without LINE verification or OTP is explicitly excluded because a national ID can be known by other people and is not a safe standalone credential.

## User Flow

1. The employee opens the LIFF application and reaches `/auth/link`.
2. LIFF initializes and requires the employee to sign in to LINE if necessary.
3. The employee enters a 13-digit Thai national ID in one field.
4. The browser rejects non-digit, wrong-length, or invalid-checksum input without calling the API.
5. The client sends `POST /v1/auth/otp/request` with the LINE access token and national ID.
6. The API verifies the LINE access token, repeats all national-ID validation, and finds one active employee with that national ID.
7. If the employee is eligible to link, the API creates an OTP and sends it to the verified LINE user.
8. The client navigates to `/auth/otp`. The existing OTP endpoint confirms the OTP, binds `Employee.LineUserId`, and returns HRMS access and refresh tokens.
9. On later visits, `POST /v1/auth/line` finds the linked employee by `LineUserId` and signs the employee in without showing `/auth/link`.

## Thai National ID Validation

Both client and server use the same rule:

- input must contain exactly 13 ASCII digits;
- calculate the weighted sum of digits 1-12 using weights 13 down to 2;
- calculate the check digit as `(11 - (sum % 11)) % 10`;
- the result must equal digit 13.

The API is authoritative. Client validation exists only to provide immediate feedback and reduce unnecessary requests.

## Component Changes

### LIFF web

`apps/liff-web/app/auth/link/page.tsx` will:

- remove `employeeCode` from the form type, schema, visual field, icons, and request payload;
- retain numeric input mode and the 13-character limit;
- add Thai national-ID checksum validation;
- keep the current LINE login, `next` redirect, loading, OTP navigation, and already-linked navigation behavior;
- avoid persisting the national ID in local storage, session storage, query strings, logs, or error messages.

The employee sees a specific local validation message for malformed input. Server-side lookup failures use a generic message that does not reveal whether a national ID exists.

### API contract

The request changes from:

```json
{
  "accessToken": "...",
  "employeeCode": "EMP001",
  "nationalId": "1103703466623"
}
```

to:

```json
{
  "accessToken": "...",
  "nationalId": "1103703466623"
}
```

`OtpRequest` and `RequestOtpCommand` will no longer expose `EmployeeCode`. Their validators will require a non-empty LINE access token and a valid Thai national ID.

This is an intentional breaking change for callers of `POST /v1/auth/otp/request`. The repository's LIFF client is updated in the same release.

### OTP request handler

`RequestOtpHandler` will:

- verify the LINE access token before querying employee data;
- query active employees using normalized national ID only;
- issue an OTP only when exactly one active matching employee exists and `LineUserId` is empty;
- fail closed if duplicate active rows exist, instead of selecting an arbitrary employee;
- preserve the existing already-linked conflict behavior and OTP push delivery.

The current database index on `national_id` is not unique. Employee creation and import already prevent normal duplicate creation, but the handler must still detect legacy or inconsistent duplicates. Adding a unique database migration is outside this change; duplicate cleanup can be handled separately after production data is audited.

## Error Handling and Privacy

- Invalid or expired LINE token: return the existing unauthorized response.
- Invalid national-ID format or checksum: reject through request validation without a database lookup or OTP.
- No active match or ambiguous duplicate match: return the same generic employee-verification failure to prevent account enumeration.
- Employee already linked: preserve `ALREADY_LINKED` and the current LIFF recovery page.
- OTP delivery failure: do not bind the account; surface the existing API failure behavior.
- Invalid or expired OTP: preserve the current generic OTP error and do not bind the account.

National IDs must not be included in application logs, telemetry, query strings, or user-visible server errors. The existing `auth_strict` rate limit stays enabled on OTP request and account-link endpoints.

## Data and Concurrency

No database column or migration is needed. `Employee.NationalId`, `Employee.LineUserId`, refresh tokens, and OTP storage retain their current roles.

The final account binding continues to occur only after OTP consumption. The implementation should preserve the current one-to-one LINE binding checks and treat concurrent or conflicting binding attempts as failures rather than overwriting an existing binding.

## Testing

### API tests

- validator accepts a correctly checksummed 13-digit national ID;
- validator rejects wrong length, non-digits, and wrong checksum;
- OTP request succeeds for exactly one active, unlinked employee found by national ID;
- employee code is not required by the command or controller request;
- inactive, missing, and duplicate active matches do not generate an OTP;
- an already-linked employee retains the existing conflict response;
- invalid LINE token is rejected before OTP generation;
- OTP confirmation still binds the verified LINE user and returns tokens.

### LIFF web tests

- the page renders one national-ID field and no employee-code field;
- invalid input is blocked locally with the expected Thai message;
- valid input sends only `accessToken` and `nationalId`;
- success navigates to `/auth/otp` while preserving `next`;
- already-linked and server-error paths preserve their existing behavior.

### Regression checks

- linked employees still sign in through `/v1/auth/line`;
- OTP resend and confirmation continue to work;
- admin email/password login and external ticket LINE authentication are unaffected.

## Acceptance Criteria

- `/auth/link` asks for only a 13-digit national ID after LINE login.
- Both client and server enforce Thai national-ID checksum validation.
- A valid request sends an OTP to the verified LINE account.
- The account is bound and authenticated only after correct OTP confirmation.
- The API no longer requires or uses employee code for this flow.
- Missing or duplicate employee data cannot bind an arbitrary account.
- Existing post-link LINE login remains unchanged.
