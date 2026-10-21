# API Specification & Conventions

## 1. Protocol & Versioning

- **Base URL Prefix**: `/api/v1`
- **Protocol**: HTTPS (enforced in production)
- **Content Type**: `application/json` (enforced with 1MB maximum payload limits)
- **Versioning Strategy**: URI prefix versioning (`/api/v1`).

---

## 2. Standardized Response Formats

All API endpoints strictly follow predictable JSON response envelopes.

### Success Response Envelope (HTTP 200, 201)

```json
{
  "success": true,
  "data": { ... },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response Envelope (HTTP 4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have authorized membership in this workspace.",
    "details": null
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Standard Error Codes

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 422 | Request body, query, or path params failed Zod validation |
| `BAD_REQUEST` | 400 | Malformed JSON or syntactically invalid input |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks required role permissions or does not belong to workspace |
| `NOT_FOUND` | 404 | Endpoint or targeted resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. email already registered) |
| `EMAIL_ALREADY_EXISTS` | 409 | Public registration with existing email address |
| `INVALID_CREDENTIALS` | 401 | Incorrect email or password on login |
| `TOKEN_EXPIRED` | 401 | JWT access token or verification token has expired |
| `TOKEN_REVOKED` | 401 | Refresh token or session was revoked |
| `INVITATION_INVALID` | 400 | Invitation token is invalid or does not match email |
| `INVITATION_EXPIRED` | 400 | Workspace invitation expired past 7-day validity |
| `LAST_OWNER_CANNOT_BE_REMOVED` | 400 | Attempted to demote or remove the sole owner of a workspace |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit threshold exceeded on authentication endpoints |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled internal exception (sanitized in production) |

---

## 3. Implemented Endpoints (Phase 2)

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | None | Register new user; auto-provisions default workspace; sets HttpOnly refresh cookie |
| `POST` | `/api/v1/auth/login` | None | Authenticate with email/password; returns user, access token; sets HttpOnly cookie |
| `POST` | `/api/v1/auth/logout` | Optional | Revokes current session and clears `refreshToken` cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie / Body | Rotates refresh token; revokes entire family on reuse detection; returns new access token |
| `GET` | `/api/v1/auth/me` | Bearer Token | Returns current authenticated user profile |
| `POST` | `/api/v1/auth/verify-email` | None | Validates single-use token and marks email verified |
| `POST` | `/api/v1/auth/forgot-password` | None | Dispatches password reset email (generic response prevents enumeration) |
| `POST` | `/api/v1/auth/reset-password` | None | Resets password using single-use token; invalidates all active user sessions |

### Workspaces (`/api/v1/workspaces`)

| Method | Endpoint | Min Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/workspaces` | User | Create a new customer workspace and assign caller as `owner` |
| `GET` | `/api/v1/workspaces` | User | List all active workspaces the user has membership in |
| `GET` | `/api/v1/workspaces/:workspaceId` | `viewer` | Get detailed metadata for the specified workspace |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | `admin` | Update workspace properties (name) |

### Team Members & Invitations

| Method | Endpoint | Min Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | `viewer` | List all active members of the workspace |
| `POST` | `/api/v1/workspaces/:workspaceId/invitations` | `admin` | Invite a new user by email with role assignment |
| `POST` | `/api/v1/invitations/:token/accept` | User | Accept an invitation to join a workspace |
| `POST` | `/api/v1/invitations/:token/reject` | None | Reject a workspace invitation |
| `PATCH` | `/api/v1/workspaces/:workspaceId/members/:memberId` | `admin` | Update member role (`admin`, `member`, `viewer`) |
| `DELETE` | `/api/v1/workspaces/:workspaceId/members/:memberId` | `admin` | Remove member from workspace (guarantees last owner cannot be removed) |
| `POST` | `/api/v1/workspaces/:workspaceId/transfer-ownership` | `owner` | Transfer workspace ownership to an active member |

### WhatsApp Business Accounts (`/api/v1/workspaces/:workspaceId/whatsapp-accounts`)

| Method | Endpoint | Min Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts` | `viewer` | List all WhatsApp Business Accounts connected to the workspace |
| `GET` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts/:accountId` | `viewer` | Get detailed status and metadata for a specific WhatsApp account |
| `POST` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts` | `admin` | Connect a WABA; encrypts access token at rest using AES-256-GCM |
| `POST` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts/:accountId/sync` | `admin` | Sync live phone number details, quality rating, and templates from Meta Graph API |
| `POST` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts/:accountId/disconnect` | `admin` | Safely disconnect an account, setting status to `disconnected` |
| `DELETE` | `/api/v1/workspaces/:workspaceId/whatsapp-accounts/:accountId` | `admin` | Permanently remove a WhatsApp account and its credentials from the workspace |

### Meta WhatsApp Webhooks (`/api/v1/webhooks/whatsapp`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/webhooks/whatsapp` | Meta Verify Token | Meta challenge handshake (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `POST` | `/api/v1/webhooks/whatsapp` | `X-Hub-Signature-256` | Ingest Meta webhook events with HMAC-SHA256 signature verification & deduplication |

### Contact Directory (`/api/v1/workspaces/:workspaceId/contacts`)

| Method | Endpoint | Min Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/workspaces/:workspaceId/contacts` | `viewer` | List paginated contacts with search, tag, consent, and suppression filters |
| `GET` | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | `viewer` | Get detailed record for a specific contact |
| `POST` | `/api/v1/workspaces/:workspaceId/contacts` | `member` | Create contact; normalizes phone number to E.164 format and validates consent |
| `PATCH` | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | `member` | Update contact display name, email, tags, custom fields, and consent status |
| `POST` | `/api/v1/workspaces/:workspaceId/contacts/:contactId/suppression` | `member` | Explicitly suppress or unsuppress a contact from future marketing campaigns |
| `POST` | `/api/v1/workspaces/:workspaceId/contacts/import` | `member` | Bulk import contacts from CSV (5,000 row limit, upsert support, error reporting) |
| `GET` | `/api/v1/workspaces/:workspaceId/contacts/export` | `viewer` | Export tenant contacts to downloadable CSV (filtered by tag, consent, suppression) |
| `DELETE` | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | `admin` | Permanently delete a contact from the workspace directory |

---

## 4. Health & Liveness Endpoints

- `GET /api/v1/health` (Liveness Probe — 200 OK)
- `GET /api/v1/health/ready` (Readiness Probe — executes real MongoDB `ping`)

## Billing API (workspace-scoped)

All routes are under `/api/v1/workspaces/:workspaceId/billing` and require a Bearer token plus active workspace membership. Money is always an integer in minor units (`amountMinor`) with an ISO-4217 `currency`. Errors use the standard envelope; billing adds the codes `INSUFFICIENT_FUNDS` (402), `SUBSCRIPTION_INACTIVE` (403), `PAYMENT_PROVIDER_NOT_CONFIGURED` (503), `INVALID_SIGNATURE` (401).

| Method & path | Min role | Notes |
| --- | --- | --- |
| `GET /subscription` | viewer | status (derived from timestamps), trial window, `canDispatch`, `denialReason`, entitlements. Starts the trial lazily for pre-existing workspaces. |
| `GET /entitlements` | viewer | `{ status, canDispatch, entitlements }` |
| `GET /plans` | viewer | Latest active plan versions. `purchasable=false` until prices and a provider exist. |
| `POST /subscription/checkout` | owner | Returns 503 `PAYMENT_PROVIDER_NOT_CONFIGURED` until a provider and prices are configured. |
| `POST /subscription/cancel` | owner | Idempotent; audited. |
| `GET /wallet?currency=` | admin | `{ currency, postedMinor, reservedMinor, availableMinor, lowBalance }` |
| `GET /wallet/transactions?limit=&cursor=` | admin | Newest-first, cursor = last entry id. |
| `GET /wallet/top-ups`, `GET /wallet/top-ups/:paymentId` | admin | Payment status. |
| `POST /wallet/top-ups` | admin | Body `{ amountMinor, currency? }`. Creates a **pending** payment only. |
| `POST /wallet/adjustments` | owner | Body `{ direction, amountMinor, memo, idempotencyKey }`; appends a ledger entry, audited, cannot overdraw. |
| `GET /wallet/reconciliation` | owner | Compares cached balances with ledger sum and active reservations. |

### Payment callback (public)
`POST /api/v1/webhooks/payments` with header `x-payment-signature: <hex HMAC-SHA256 of the raw body using PAYMENT_WEBHOOK_SECRET>` and body `{ eventId, type: "payment.succeeded"|"payment.failed", paymentReference, amountMinor, currency }`. The tenant is resolved from the stored payment, never the payload. Amount/currency must match. Redelivery returns `duplicate: true` and never credits twice.

## WhatsApp channel management (workspace-scoped)

Base: `/api/v1/workspaces/:workspaceId/whatsapp-accounts`. The Meta access token is always the one stored (encrypted) for the account; clients never send or receive tokens. Operations other than `reconnect` return 409 for a disconnected account. Meta failures surface as 502 `SERVICE_UNAVAILABLE` with Meta's message.

| Method & path | Min role | Notes |
| --- | --- | --- |
| `GET /:accountId/phone-numbers` | viewer | Numbers under the account's WABA with `connected` (this workspace) and `unavailable` (connected in another workspace) flags. |
| `POST /:accountId/phone-numbers` | admin | `{ phoneNumberId }`. Must be listed under the WABA; reuses the credential; registers with a random 6-digit PIN stored encrypted; 409 if connected here or elsewhere. |
| `POST /:accountId/reconnect` | admin | Validates the stored token, re-registers, re-subscribes webhooks, restores `connected`. 409 if the token is invalid (run Embedded Signup again) or another workspace holds the number. |
| `PATCH /:accountId/profile` | admin | Adds optional `profilePicture: { data: <base64>, mimeType: image/jpeg\|image/png }` (<= 5 MB decoded; the JSON body limit makes ~1.3 MB the practical cap). Magic bytes are checked against `mimeType`. `vertical` must be a Meta vertical; `websites` max 2, http(s). |
| `GET /:accountId/blocked-users?limit&after&before` | admin | Cursor-paged; names come from this workspace's contacts. |
| `POST /:accountId/blocked-users` | admin | `{ users: [E.164...] }` (1-25). Returns `{ changed, failed[] }`. |
| `POST /:accountId/blocked-users/unblock` | admin | Same body. |

All mutations write audit events (`whatsapp.phone_number_added`, `.account_reconnected`, `.profile_updated`, `.users_blocked`, `.users_unblocked`).

## Webhook processing (`POST /api/v1/webhooks/whatsapp`)

Signature-verified, persisted before acknowledgement, then processed asynchronously per change. The owning workspace is resolved per change from our own account records (`phone_number_id`, else WABA + display number), never taken from the payload.

| Field / event | Effect |
| --- | --- |
| `messages` statuses | Forward-only status update (a late `sent` never overwrites `read`), scoped to the owning workspace; `failed` stores `{code, message}`; campaign counters change only when a status actually advances. |
| `messages` inbound | text, button, interactive (button/list reply), image/video/audio/document/sticker (media **id** stored, not downloaded), location, contacts, reaction (annotates the target message), reply context and click-to-WhatsApp referral. Phones normalised to E.164. Idempotent per message id. Ignored for unknown/disconnected numbers. |
| `phone_number_name_update` | Records `nameStatus`; only `APPROVED` changes the display name. |
| `phone_number_quality_update` | Records `messagingLimit` and the last quality event. |
| `account_update` `VERIFIED_ACCOUNT` | Records `businessVerification`. |
| `account_update` `PARTNER_REMOVED` / `ACCOUNT_DELETED` | Marks every account of that WABA `disconnected`. |
| `account_update` `PARTNER_APP_INSTALLED` | Logged only; accounts are created solely by our Embedded Signup completion. |

Dedupe key: a single message/status keeps its natural id; a batch uses a hash of all item ids, so a batch containing one already-seen message is not dropped.
