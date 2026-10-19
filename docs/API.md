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
