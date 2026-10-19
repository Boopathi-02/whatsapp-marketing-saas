# Implementation Plan & Phase Roadmap

## 1. Multi-Phase Roadmap Overview

| Phase | Milestone | Scope & Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Production-Grade Foundation** | Monorepo setup, Express API shell, Health probes, React + MUI dashboard, Demo mode isolation, Docker configs, Automated tests | **COMPLETED** |
| **Phase 2** | **Secure Authentication & Multi-Tenant Architecture** | Argon2id password hashing, JWT access + HttpOnly refresh token rotation, User/Workspace/Member/Session models, Server-side RBAC, Team invitations, Protected React routes, 40 integration tests | **COMPLETED** |
| **Phase 3** | **Official WhatsApp Cloud API & Contact Directory** | Meta Cloud API Adapter (v26.0), AES-256-GCM token encryption, Webhook HMAC-SHA256 & deduplication, Tenant-isolated Contact Directory, CSV import/export, Suppression & consent, React UI | **COMPLETED** |
| **Phase 4** | **Campaign Engine & Worker Queues** | BullMQ queue workers, batch chunking, Meta rate limiting, Webhook delivery receipt processing, Template synchronization | Planned |
| **Phase 5** | **Billing & Quota Subscriptions** | Stripe Checkout, Customer portal, Monthly message quota metering, Overage controls, Invoice management | Planned |
| **Phase 6** | **Super Admin & Production Hardening** | System admin controls, Cross-workspace telemetry, Audit logs, Zero-downtime rolling deploys, SOC2 compliance | Planned |

---

## 2. Phase 2 Completion Checklist

- [x] Implemented Mongoose models with validation & indexes in `@whatsapp-saas/database`:
  - `User` (`UserModel`): unique email, Argon2id password hash, status, email verification.
  - `Workspace` (`WorkspaceModel`): unique slug, ownerId, status.
  - `WorkspaceMember` (`WorkspaceMemberModel`): compound unique index `{ workspaceId: 1, userId: 1 }`, roles (`owner`, `admin`, `member`, `viewer`).
  - `WorkspaceInvitation` (`WorkspaceInvitationModel`): tokenHash, TTL index on `expiresAt`.
  - `Session` (`SessionModel`): tokenHash, tokenFamily, revocation metadata, TTL index.
  - `EmailVerificationToken` (`EmailVerificationTokenModel`): single-use tokenHash, TTL index.
  - `PasswordResetToken` (`PasswordResetTokenModel`): single-use tokenHash, TTL index.
- [x] Implemented transaction-safe repositories with standalone MongoDB compensation rollback fallback.
- [x] Built authentication & security utilities in `apps/api`: Argon2id, JWT, rate limiting, email service.
- [x] Built authorization middleware: `requireAuth`, `requireWorkspace(minRole)`.
- [x] Built complete REST endpoints (`/api/v1/auth/*`, `/api/v1/workspaces/*`, `/api/v1/invitations/*`).
- [x] Built React/MUI frontend authentication & tenant UI in `apps/web`.

---

## 3. Phase 3 Completion Checklist

- [x] **Official Meta WhatsApp Cloud API Provider Adapter (`packages/whatsapp-adapter`)**:
  - `WhatsAppAdapter` interface defining contract for Cloud API interactions.
  - `MetaWhatsAppCloudAdapter` implementing Graph API v26.0 (configurable via `META_GRAPH_API_VERSION`).
  - Account and phone number metadata synchronization (`fetchPhoneNumberDetails`, `fetchWabaDetails`).
  - Template synchronization foundation (`fetchTemplates`).
  - `MockWhatsAppAdapter` for unit/integration tests with zero external network dependencies.
- [x] **Credential Security & Encryption at Rest**:
  - Authenticated `AES-256-GCM` encryption/decryption with random 12-byte IV and 16-byte authentication tag.
  - Storage in `whatsapp_accounts.accessTokenEncrypted`.
  - Plaintext tokens NEVER returned to frontend (`toJSON` projection strips `accessTokenEncrypted`).
  - Zero token exposure in logs (redacted in Pino logger).
  - Safe disconnection and credential deletion operations.
- [x] **Webhook Foundation & Event Deduplication**:
  - Meta GET verification handshake (`hub.mode`, `hub.challenge`, `hub.verify_token`).
  - Meta POST payload signature verification using raw request buffer and `X-Hub-Signature-256` HMAC-SHA256.
  - Constant-time signature comparison (`crypto.timingSafeEqual`) preventing timing attacks.
  - Durable persistence in `webhook_events` collection before acknowledging receipt.
  - Event deduplication using unique `providerEventId` with idempotent duplicate response handling.
  - Provider identifier resolution: Webhook events resolve tenant workspace by phone number ID, never trusting unverified workspace IDs in payloads.
- [x] **Tenant-Isolated Contact Directory**:
  - `contacts` Mongoose model with compound unique index `{ workspaceId: 1, phoneNumber: 1 }`.
  - International E.164 phone number normalization using `libphonenumber-js`.
  - Contact fields: `workspaceId`, `phoneNumber`, `displayName`, `email`, `tags`, `customFields`, `source`, `consentStatus`, `consentSource`, `consentTimestamp`, `isSuppressed`, `suppressedAt`, `suppressionReason`.
  - Paginated, searchable, and filterable listing (by search query, tag, consent status, suppression status).
  - CSV Bulk Import with streaming validation, 5,000 row limit, duplicate upserting, and per-row error summary.
  - CSV Export strictly scoped to validated workspace.
  - Explicit marketing consent tracking (`OPTED_IN`, `OPTED_OUT`, `PENDING`) and suppression controls.
- [x] **Frontend User Interface (`apps/web`)**:
  - `AccountsPage` (`/whatsapp-accounts`): Connect WABA dialog with token masking, live quality badges, sync, disconnect, and safe deletion.
  - `ContactsPage` (`/contacts`): Contact directory table with E.164 formatting, search & filter bars, Add/Edit dialog, CSV import dialog with progress/error feedback, CSV export download, and suppression toggle dialog.
  - Sidebar navigation updated with active links to WhatsApp Accounts and Contacts.
- [x] **Automated Testing & Verification**:
  - 14 test suites across API and Web, 78 tests passing 100%.
  - Zero test regressions from Phase 1 and Phase 2.
  - Clean `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

---

## 4. Phase 4 Prerequisites (Upcoming)

Before commencing Phase 4 (Campaign Engine & Worker Queues):
1. BullMQ worker queue pipeline configuration in `apps/worker`.
2. Redis connection configured for message batch dispatching.
3. Meta Cloud API rate limiting and backoff controls.
