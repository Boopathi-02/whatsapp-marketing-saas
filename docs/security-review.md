# Pingza Security Review & Controls

## 1. Threat Model & Mitigation Strategy

As a commercial multi-tenant SaaS handling proprietary customer communication, Pingza enforces defense-in-depth across the application lifecycle.

---

## 2. Implemented Security Controls

### A. Authentication & Credential Storage
1. **Password Hashing:**
   - Evaluated using **Argon2id** (memory cost 65536 KiB, time cost 3, parallelism 4), preventing GPU-accelerated brute-force attacks.
2. **Rotating Refresh Tokens:**
   - Single-use cryptographically random refresh tokens stored as SHA-256 hashes in MongoDB.
   - **Reuse Detection:** If an already-rotated token is presented, the entire family of active sessions for that user is immediately revoked.
3. **Short-Lived Access Tokens:**
   - 15-minute expiration signed with HMAC-SHA256.

### B. Tenant Isolation & IDOR Defense
1. **Server-Side Context:**
   - The active tenant is extracted strictly from the authenticated JWT session and validated against the workspace membership table via `requireWorkspace()`.
   - Client-provided workspace IDs in URLs or bodies are compared against verified membership; mismatches return `403 FORBIDDEN`.
2. **Database Query Scoping:**
   - All repository reads, writes, updates, and deletes include `{ workspaceId }` in the query filter.
3. **Cross-Tenant Phone Hijacking Defense:**
   - Enforced by a MongoDB partial unique index on `{ phoneNumberId: 1 }` with `{ partialFilterExpression: { status: 'connected' } }`.
   - Prevents an adversary in Workspace B from registering or taking over a phone number actively connected to Workspace A.

### C. WhatsApp Credential Security & Zero Token Leakage
1. **AES-256-GCM Encryption at Rest:**
   - Meta system user tokens, user access tokens, and API secrets are encrypted using authenticated **AES-256-GCM** with a managed 32-byte key (`CREDENTIAL_ENCRYPTION_KEY`).
   - Every encrypted record contains its own random 12-byte initialization vector (IV) and 16-byte authentication tag to guarantee confidentiality and ciphertext integrity.
2. **Zero Client Leakage:**
   - Access tokens, encrypted strings, and app secrets are stripped from all API response DTOs (`WhatsAppAccountDto`, `SyncWhatsAppAccountResponse`).
   - Sensitive tokens are explicitly redacted from structured logs (`pino`).
   - The frontend never stores access tokens or secrets in `localStorage`, `sessionStorage`, or cookies.

### D. Webhook Verification & Replay Protection
1. **HMAC-SHA256 Signature Verification:**
   - Incoming webhook POST requests are cryptographically validated against `META_APP_SECRET` using `crypto.createHmac('sha256', secret)`.
   - Unsigned or invalid requests are immediately rejected with `401 UNAUTHORIZED`.
2. **Event Deduplication & Atomic Indices:**
   - Compound unique index on `{ eventId: 1, eventType: 1 }` prevents processing duplicated webhook events.
   - Status updates enforce strict chronological ordering (`sent` -> `delivered` -> `read`), preventing delayed delivery receipts from overwriting newer read statuses.

### E. Consent & Suppression Enforcement
1. **Opt-In Verification:**
   - Campaigns and broadcast messages strictly verify that `optInStatus === 'opted_in'` and `isSuppressed !== true`.
   - Suppression checks are evaluated immediately before dispatch in the execution pipeline, guaranteeing that contacts who opted out after campaign creation cannot be sent marketing messages.

### F. Network & Transport Security
1. **TLS / HTTPS:**
   - Production dispatches enforce HTTPS across all Meta Graph API communications.
2. **HTTP Headers:**
   - Helmet sets `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: no-referrer`.
