# Automated Testing & Verification Guide

## 1. Testing Strategy

Pingza implements an automated testing strategy ensuring multi-tenant isolation, cryptographic integrity, request schema validation, and WhatsApp provider communication without requiring real Meta developer accounts or live customer phone numbers during CI/CD.

```
Testing Pyramid:
┌────────────────────────────────────────────────────────┐
│  E2E / Workflow Tests (Embedded Signup, Campaigns)     │
├────────────────────────────────────────────────────────┤
│  API Integration Tests (RBAC, Tenancy, Meta Mocks)     │
├────────────────────────────────────────────────────────┤
│  Unit Tests (Argon2id, AES-256-GCM, Zod Contracts)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Test Execution Commands

```bash
# Run all tests across monorepo
pnpm test

# Run API tests specifically
pnpm --filter @whatsapp-saas/api test

# Run Web frontend tests specifically
pnpm --filter @whatsapp-saas/web test
```

---

## 3. Test Suites & Coverage Breakdown

### A. Core Authentication & Multi-Tenancy (`apps/api/src/__tests__/`)
- **`auth.integration.test.ts` (14 tests):**
  - Argon2id password hashing and secure login.
  - Refresh token rotation, expiration, and multi-session revocation.
  - Immediate family-wide token revocation upon refresh token reuse detection.
  - Password reset with email verification tokens.
- **`tenant_isolation.integration.test.ts` (11 tests):**
  - Cross-tenant IDOR attack prevention on workspaces, members, and data.
  - Role-Based Access Control (Owner > Admin > Member > Viewer).
- **`workspaces.integration.test.ts` (4 tests):**
  - Workspace creation, invitations, and ownership transfers.

### B. WhatsApp Cloud API & Embedded Signup v4
- **`whatsapp_accounts.integration.test.ts` (13 tests):**
  - Meta Embedded Signup v4 public configuration retrieval.
  - Authorization code exchange and server-side verification.
  - **AES-256-GCM Token Encryption at Rest:** plain tokens are never stored or leaked.
  - **Zero Leakage:** Responses omit all sensitive tokens and secrets.
  - **Cross-Tenant Phone Hijacking Defense:** Database-level uniqueness rejects duplicate phone numbers across different tenants (`409 CONFLICT`).
  - Idempotent reconnection: updates existing record safely without duplicate records.
  - Non-admin RBAC rejection (`403 FORBIDDEN`).
  - Invalid authorization code handling (`400 BAD REQUEST`).

### C. Contact Directory & Consent Enforcement
- **`contacts.integration.test.ts` (12 tests):**
  - E.164 phone normalization and deduplication per workspace.
  - Tag management and custom attribute filtering.
  - Opt-in consent tracking and suppression enforcement.
  - CSV bulk stream ingestion (validating up to 5,000 rows with error reporting).

### D. Webhooks & Message Tracking
- **`webhooks.integration.test.ts` (8 tests):**
  - Cryptographic HMAC-SHA256 signature verification over raw request body.
  - Rejection of invalid or unsigned requests (`401 UNAUTHORIZED`).
  - Idempotent webhook event deduplication.
  - Message lifecycle progression (`sent` -> `delivered` -> `read` -> `failed`).

### E. Message Templates (`apps/api/src/__tests__/templates.integration.test.ts`) (6 tests)
- Authoring and parameter validation for templates.
- Rejection of invalid template naming conventions (`422 UNPROCESSABLE_ENTITY`).
- Duplicate template prevention (same name and language in workspace: `409 CONFLICT`).
- Meta Graph API template synchronization into local workspace database.
- Multi-tenant isolation: Workspace B cannot view or delete Workspace A templates (`404 NOT_FOUND` / `403 FORBIDDEN`).
- RBAC enforcement: Viewer roles cannot create, sync, or delete templates.

### F. Broadcast Campaigns & Quick Replies (`apps/api/src/__tests__/campaigns.integration.test.ts`) (7 tests)
- Campaign creation with APPROVED templates and connected WhatsApp accounts.
- Rejection of unapproved templates (PENDING/REJECTED).
- **Consent and Suppression Enforcement:** only opted-in, non-suppressed contacts are selected for broadcast.
- Dynamic contact segmentation via `tagFilter`.
- Immediate campaign dispatch with atomic progress increments (`sentCount`).
- Safe campaign cancellation.
- Cross-tenant campaign access rejection.
- Quick Replies CRUD, shortcut uniqueness per workspace, and multi-tenant isolation.

### G. Live WhatsApp Inbox & Conversations (`apps/api/src/__tests__/conversations.integration.test.ts`) (13 tests)
- Conversation thread listing, pagination, and sorting by last message timestamp.
- Filtering threads by search query (phone number and contact name) and unread status.
- Retrieval of single conversation thread details.
- Message history inspection with inbound/outbound direction tracking.
- Outbound text message dispatch and real-time thread updating.
- Outbound template message dispatch for customer care initiation.
- Request payload validation and rejection of missing parameters (`422 UNPROCESSABLE_ENTITY`).
- Safe resetting of unread counters on thread read (`POST /read`).
- **Strict Multi-Tenant Isolation & IDOR Defense:** Unauthorized cross-workspace reads, message sends, and read status updates are strictly rejected with `403 FORBIDDEN`.

### H. Frontend Components & UI Workflows (`apps/web/src/__tests__/`)
- **`embedded_signup.test.tsx` (5 tests):**
  - `useMetaEmbeddedSignup` React hook testing.
  - Origin-verified cross-window `WA_EMBEDDED_SIGNUP` postMessage listener (`FINISH`, `CANCEL`, `ERROR`).
  - Authorization code handoff to backend API.
  - Popup cancellation and friendly error message reporting.
- **`conversations_and_profile.test.tsx` (3 tests):**
  - Live WhatsApp Inbox header, quick replies trigger, and empty states.
  - Real-time conversation thread listing with message snippets and unread badges.
  - Meta Business Profile dialog rendering with profile picture, description, address, email, websites, and vertical category.
- **`phase3_pages.test.tsx` (4 tests):**
  - AccountsPage and ContactsPage rendering, empty states, and action buttons.
- **`app.test.tsx`, `sidebar.test.tsx`, & `PingzaLogo.test.tsx` (9 tests):**
  - Authentication routing, protected route guards, sidebar navigation (including Live Inbox), and brand elements.

---

## 4. Current Test Results Baseline

| Package | Test Files | Tests | Status |
|---|---|---|---|
| `@whatsapp-saas/api` | 13 | 103 | **100% Passed (0 Failed)** |
| `@whatsapp-saas/web` | 6 | 21 | **100% Passed (0 Failed)** |
| **Total Monorepo** | **19** | **124** | **100% Passed (0 Failed)** |
