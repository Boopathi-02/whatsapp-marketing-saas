# Pingza — WhatsApp Marketing SaaS Platform (Phase 3)

[![CI Pipeline](https://github.com/Boopathi-02/whatsapp-marketing-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/Boopathi-02/whatsapp-marketing-saas/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

**Pingza** is a production-grade, multi-tenant WhatsApp Marketing SaaS platform with secure Argon2id authentication, JWT/HttpOnly refresh token rotation & reuse detection, workspace management, official Meta WhatsApp Cloud API integration, webhook verification & deduplication, and a tenant-isolated contact directory.

---

## 1. Features Implemented

### Authentication & Sessions (Phase 2)
- **Argon2id Password Hashing**: State-of-the-art password security (64MB memory cost, 3 iterations, 4 parallelism).
- **Dual-Token Architecture**: Short-lived JWT access tokens + cryptographically random refresh tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Refresh Token Rotation & Family Reuse Detection**: Automatically revokes all sessions in a token family if an already-consumed token is presented.
- **Email Verification & Password Reset**: Secure, single-use, SHA-256 hashed expiring tokens with generic anti-enumeration responses.
- **Session Revocation**: User logout and password reset invalidates all active sessions server-side.
- **Authentication Rate Limiting**: 30 requests per 15-minute window per IP on auth endpoints.

### Multi-Tenant Workspaces (Phase 2)
- **Workspace Isolation**: Verified server-side tenant scoping on every workspace endpoint.
- **Role-Based Access Control (RBAC)**: Permission matrix enforcing `owner > admin > member > viewer`.
- **Team Invitations**: Single-use, expiring invitations sent via email with token hashing.
- **Last-Owner Protection**: Invariant preventing removal or demotion of the last remaining workspace owner.
- **Ownership Transfer**: Secure transfer of workspace ownership to active team members.

### Official Meta WhatsApp Cloud API Integration (Phase 3)
- **Modular Provider Adapter (`packages/whatsapp-adapter`)**: Official Meta WhatsApp Business Platform Cloud API adapter targeting configurable Graph API version (v26.0 default).
- **Credential Security at Rest**: System user access tokens encrypted using authenticated `AES-256-GCM` with random 12-byte IV and 16-byte authentication tag. Tokens are never exposed to the frontend or logs.
- **Account & Metadata Synchronization**: Syncs live phone number verification status, display phone number, verified business name, and quality ratings (`GREEN`, `YELLOW`, `RED`).
- **Safe Disconnection & Deletion**: Disconnects WABA credentials cleanly without leaking tokens or breaking workspace data.

### Webhook Verification & Deduplication (Phase 3)
- **GET Handshake Verification**: Validates Meta webhook challenge handshake (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- **POST HMAC-SHA256 Verification**: Computes cryptographic HMAC-SHA256 over raw request binary buffers using Meta App Secret and compares via timing-safe comparison (`crypto.timingSafeEqual`).
- **Durable Persistence & Deduplication**: Durably records events to `webhook_events` collection before acknowledgment. Enforces deduplication via unique `providerEventId`.
- **Tenant Ownership Resolution**: Routes webhooks to tenant workspaces via verified provider `phoneNumberId`, never trusting client-supplied workspace IDs.

### Tenant-Isolated Contact Directory (Phase 3)
- **Compound Unique Tenant Scoping**: Enforces `{ workspaceId: 1, phoneNumber: 1 }` unique index preventing duplicate contacts per workspace and guaranteeing complete cross-tenant isolation.
- **E.164 Phone Normalization**: Normalizes and validates international phone numbers with `libphonenumber-js`.
- **Search, Filters & Pagination**: Multi-field search, tag filtering, consent status filtering, and suppression filtering.
- **CSV Bulk Import & Export**: Streaming CSV parser with 5,000 row limits, field validation, duplicate upserting, and detailed per-row error summary. Cross-workspace leak-free CSV exports.
- **Opt-In Consent & Suppression Engine**: Explicit marketing opt-in consent recording (`OPTED_IN`, `OPTED_OUT`, `PENDING`) with suppression toggle. Suppressed contacts are excluded from future marketing broadcasts.

### React / MUI Frontend
- **Auth Pages**: Login, Registration, Forgot Password, Reset Password, Email Verification, Accept Invitation.
- **Protected Routes**: Unauthenticated users are redirected to `/login`.
- **Workspace Switcher**: Topbar dropdown to switch between authorized workspaces or create new ones.
- **Team Members Management**: View members, invite team members by email, modify roles, and transfer ownership.
- **WhatsApp Accounts (`/whatsapp-accounts`)**: Connect WABA dialog with token masking, live quality badges, sync, disconnect, and safe deletion.
- **Contact Directory (`/contacts`)**: E.164 table, search, tag/consent/suppression filters, Add/Edit modal, CSV bulk import with error breakdown, CSV export download, and suppression toggle modal.

---

## 2. Meta Developer App Setup Guide

To connect a real WhatsApp Business Account in staging or production:

1. **Create a Meta App**:
   - Go to [Meta for Developers](https://developers.facebook.com/).
   - Click **Create App** → Select **Business** type.
   - Add **WhatsApp** product to your app.
2. **Obtain API Credentials**:
   - In WhatsApp > Getting Started, note your **WhatsApp Business Account ID (WABA ID)** and **Phone Number ID**.
   - Create a System User in Meta Business Manager (Business Settings → Users → System Users).
   - Assign the System User to your WhatsApp account with `whatsapp_business_management` and `whatsapp_business_messaging` permissions.
   - Generate a permanent System User Access Token.
3. **Configure Webhook**:
   - In WhatsApp > Configuration, set **Callback URL** to: `https://<your-domain>/api/v1/webhooks/whatsapp`.
   - Set **Verify Token** to match `META_WEBHOOK_VERIFY_TOKEN` in `.env`.
   - Subscribe to the `messages` webhook field.
4. **Environment Variables**:
   ```env
   META_GRAPH_API_VERSION=v26.0
   META_APP_ID=your_meta_app_id
   META_APP_SECRET=your_meta_app_secret
   META_WEBHOOK_VERIFY_TOKEN=your_secure_verify_token
   CREDENTIAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   ```

---

## 3. Quick Start

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Environment Variables

```bash
# On Windows PowerShell:
Copy-Item .env.example .env
```

### Step 3: Run Development Services

```bash
# Run both API and Web Dashboard:
pnpm dev

# Or run individually:
pnpm dev:api   # API at http://localhost:4000
pnpm dev:web   # Web App at http://localhost:3000
pnpm dev:worker # Worker process
```

---

## 4. Verification & Testing

Run all quality checks and automated tests across all 9 packages:

```bash
# Typecheck all packages (0 errors)
pnpm typecheck

# Lint entire codebase (0 errors, 0 warnings)
pnpm lint

# Run all 78 automated integration and unit tests across 14 test suites
pnpm test

# Build production bundles
pnpm build
```

---

## 5. Project Architecture

```
whatsapp-marketing-saas/
├── apps/
│   ├── web/                     # React 18, Vite, Material UI, AuthContext, Accounts & Contacts Pages
│   ├── api/                     # Express.js REST API with auth, whatsapp, webhooks & contacts modules
│   └── worker/                  # Standalone background worker process
├── packages/
│   ├── contracts/               # Shared Zod schemas, DTOs and API envelopes
│   ├── domain/                  # Domain entities, validation rules, and status enums
│   ├── database/                # Mongoose models (User, Workspace, WhatsAppAccount, WebhookEvent, Contact)
│   ├── whatsapp-adapter/        # Meta Cloud API adapter and testing mock adapter
│   └── billing/                 # Plan tier definitions and quota limits
├── docs/                        # Complete architecture, database, API, security, and implementation plan
└── infrastructure/              # Docker Compose configuration for local MongoDB and Redis
```

