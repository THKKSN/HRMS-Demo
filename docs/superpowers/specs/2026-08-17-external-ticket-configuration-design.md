# External Ticket Configuration Design

**Date:** 2026-08-17

## Scope

Implement Phase 2, Task 4 of the external ticket work: secure backend configuration and taxonomy APIs. This task does not add the Admin UI, an external ticket creation endpoint, a Rich Menu route, or any production deployment operation.

## Data Model

Add exactly these external tables in a new `AddExternalTicketConfiguration` migration:

- `external_ticket_configurations`: one configuration row for the fixed company. It stores `TargetDepartmentId`, `IsEnabled`, `RequireOaFriendship`, privacy notice version and URL, and `UpdatedAt`.
- `external_ticket_categories`
- `external_ticket_topics`
- `external_ticket_subjects`

The category, topic, and subject tables form an external-only hierarchy with display name, description, sort order, and active state. Only an external subject stores `InternalTicketSubjectId`.

The fixed company is `c89cb0d1-7548-4c1b-a36a-929f094f0b30`, represented by `ExternalTicketConstants.TargetCompanyId`. No API request accepts a company identifier. Categories, topics, and subjects use soft activation only.

The migration creates only these tables, their indexes and foreign keys, plus a disabled configuration row. It must not change the Phase 1 requester/actor schema or unrelated tables.

## Authorization and APIs

Add the `ticket:manage-external-config` permission and assign it to the Admin default role. Every administrative command checks this permission in the application handler.

Administrative APIs:

```text
GET  /v1/external-ticket-config
PUT  /v1/external-ticket-config
POST /v1/external-ticket-config/categories
PUT  /v1/external-ticket-config/categories/{id}
POST /v1/external-ticket-config/topics
PUT  /v1/external-ticket-config/topics/{id}
POST /v1/external-ticket-config/subjects
PUT  /v1/external-ticket-config/subjects/{id}
```

The public external-session API is `GET /v1/external/ticket-form`. It returns only active external taxonomy and data necessary to render the future form. It never returns internal taxonomy identifiers or mappings.

## Validation and Concurrency

Enabling the channel requires:

- an active target department in the fixed company;
- non-empty privacy notice version and URL;
- at least one active external subject mapped to an active internal subject in the same company and target department.

All taxonomy mapping validation rejects cross-company, cross-department, inactive, and missing internal subjects. Updates receive `ExpectedUpdatedAt`; a stale value returns `409 CONFIG_CHANGED` rather than overwriting the latest configuration.

Every administrative mutation creates a sanitized audit record containing node names, active state, department, and internal subject mapping. It excludes LINE and contact PII.

## Failure Behavior

Commands fail explicitly for missing permission, invalid target department, invalid mapping, incomplete readiness requirements, and stale versions. The public form API hides inactive nodes and reports a disabled channel rather than returning a usable intake form.

## Verification

Add focused tests for permission denial, fixed-company enforcement, enablement readiness, taxonomy mapping validation, stale updates, and public-form filtering. Before Task 4 is considered complete, verify that the generated migration contains only the four external configuration tables and associated indexes, foreign keys, and disabled configuration seed.

Run the focused external configuration tests and the affected API/infrastructure build. Task 5 begins only after these checks pass.
