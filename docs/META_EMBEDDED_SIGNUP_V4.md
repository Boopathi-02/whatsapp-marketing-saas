# Meta WhatsApp Embedded Signup v4 Implementation & Operations Guide

## Overview

Pingza now implements **Meta WhatsApp Embedded Signup v4** (Facebook Login for Business with Embedded Signup configuration), replacing manual and fragile access-token entry with an official, secure OAuth-style customer onboarding flow.

This document details the end-to-end architecture, Meta Dashboard configuration prerequisites, environment settings, multi-tenant security controls, and verification instructions.

---

## 1. Architecture & Flow

```
+-------------------------------------------------------------------------------------------------------+
|                                    1. User clicks "Connect WhatsApp"                                  |
|                                                    v                                                  |
|   [ Pingza Web Frontend ]  --->  GET /workspaces/:wsId/whatsapp-accounts/config  --->  [ Pingza API ] |
|            |                                                                              |           |
|            | 2. Fetches appId, configId, graphApiVersion (appSecret is NEVER exposed)     |           |
|            v                                                                                          |
|   [ Meta FB.login popup ]  (with config_id, response_type: 'code', override_default_response_type)   |
|            |                                                                                          |
|            | 3. Customer logs into Meta Business Manager, selects/creates WABA and Phone Number       |
|            | 4. Meta sends cross-window postMessage: type="WA_EMBEDDED_SIGNUP", event="FINISH"        |
|            v                                                                                          |
|   [ Pingza Frontend ]  captures waba_id, phone_number_id from window message listener                 |
|   [ FB.login callback ] receives one-time authorization `code`                                        |
|            |                                                                                          |
|            | 5. POST /workspaces/:wsId/whatsapp-accounts/embedded-signup                              |
|            |    Payload: { code, wabaId, phoneNumberId }                                              |
|            v                                                                                          |
|   [ Pingza Backend Service ]                                                                          |
|       a. Exchange code with Meta Graph API: GET /oauth/access_token                                    |
|       b. Debug token: GET /debug_token (verify validity, scopes, granular WABA target IDs)           |
|       c. Server-side ownership verification: fetch WABA details & Phone details with exchanged token  |
|       d. Multi-tenant isolation check: verify Phone Number ID is not claimed by another workspace     |
|       e. Auto-subscribe WABA to Pingza Webhooks: POST /{waba_id}/subscribed_apps                     |
|       f. Register phone number on Meta Cloud API: POST /{phone_number_id}/register                    |
|       g. Encrypt access token at rest using AES-256-GCM                                               |
|       h. Atomically upsert WhatsAppAccount in MongoDB scoped to authenticated workspace               |
|       i. Return WhatsAppAccountDto to client (NEVER leaking access tokens or encrypted secrets)       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Security Controls & Tenant Isolation

1. **Zero Client Trust:**
   - Client-provided `wabaId` and `phoneNumberId` hints are never trusted blindly.
   - The server validates that the exchanged `accessToken` possesses direct authorization to access the specific `wabaId` and `phoneNumberId` via Meta's Graph API endpoints. If a malicious client passes an unauthorized phone number, Meta Graph API rejects the fetch with `400/403`.
2. **Zero Token Leakage:**
   - Meta App Secret (`META_APP_SECRET`) is stored strictly in server environment variables and never exposed to the client.
   - Exchanged user access tokens are never returned in REST API responses, never stored in browser localStorage/sessionStorage, and redacted from logs.
   - Tokens at rest are encrypted with **AES-256-GCM** using `CREDENTIAL_ENCRYPTION_KEY` (32-byte key) with unique initialization vectors (IV) and authentication tags per record.
3. **Database-Level Cross-Tenant Protection:**
   - Multi-tenant isolation is enforced at the repository and schema levels.
   - MongoDB partial unique index prevents the same phone number from being connected to more than one workspace concurrently:
     `{ phoneNumberId: 1 }` with `{ unique: true, partialFilterExpression: { status: 'connected' } }`.
4. **Idempotency & Safe Retries:**
   - If a tenant re-runs the signup flow for an already connected phone number in their own workspace, the credentials and metadata are safely refreshed without creating duplicate records or throwing 500 errors.

---

## 3. Environment Variables Configuration

Update your `.env` file (see `.env.example`):

```bash
# Meta WhatsApp Business Cloud API & Embedded Signup v4
META_GRAPH_API_VERSION=v26.0
META_APP_ID=your_meta_app_id_placeholder
META_APP_SECRET=your_meta_app_secret_placeholder
META_CONFIG_ID=your_embedded_signup_v4_config_id_placeholder
META_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_placeholder

# 32-byte hex key (64 characters) for AES-256-GCM credential encryption at rest
CREDENTIAL_ENCRYPTION_KEY=a7d2e947cf8e3c1a89b0d3e5271a4f89c02b5e7d91a348f6c1e95b7a32d1840e
```

---

## 4. Meta Dashboard Configuration & Prerequisites

To run Meta WhatsApp Embedded Signup v4 in staging and production, the following manual steps in the [Meta for Developers Dashboard](https://developers.facebook.com/) are required:

### A. Meta App Setup
1. **App Type:** Create or select a **Business** type application in Meta Developer Dashboard.
2. **Products:** Add **WhatsApp** and **Facebook Login for Business**.
3. **App Domains & Privacy Policy:**
   - Set **App Domains** (e.g., `app.pingza.com`).
   - Fill in **Privacy Policy URL** and **Terms of Service URL**.

### B. Facebook Login for Business & Embedded Signup Configuration
1. Navigate to **Facebook Login for Business > Configurations**.
2. Click **Create Configuration**:
   - Provide a configuration name (e.g., `Pingza WhatsApp Onboarding v4`).
   - Select permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Under WhatsApp Embedded Signup options, configure:
     - Business Info Collection
     - Phone Number Selection / Registration
     - Payment / Billing setup method
3. Save the configuration and copy the resulting **Configuration ID** into `META_CONFIG_ID`.

### C. Allowed Domains & SDK JavaScript Origins
1. Navigate to **Facebook Login for Business > Settings**.
2. Under **Allowed Domains for JavaScript SDK**, add your development and production domains (e.g., `https://localhost:3000`, `https://app.pingza.com`).
3. Note: Meta requires HTTPS for all JavaScript SDK origins. For local testing with real Meta dialogs, use an HTTPS tunnel (e.g., Cloudflare Tunnel, ngrok) or `mkcert`.

### D. Webhooks Configuration
1. Under **WhatsApp > Configuration > Webhook**:
   - Callback URL: `https://api.pingza.com/api/v1/webhooks/whatsapp`
   - Verify Token: matches `META_WEBHOOK_VERIFY_TOKEN`.
   - Subscriptions: check `messages`, `message_template_status_update`.

### E. Manual Business Verification & App Review Prerequisites
For live customer production usage (outside Meta App admins/developers/testers):
1. **Meta Business Verification:** Your organization must complete Meta Business Verification in Meta Business Manager.
2. **App Review:** Submit `whatsapp_business_management` and `whatsapp_business_messaging` for App Review before non-developer accounts can sign up.
3. **Tech Provider / Solution Provider Status:** Register as a Meta Tech Provider if offering multi-tenant WhatsApp services to independent businesses at scale.

---

## 5. Local Testing Instructions

### Running Automated Test Suites (Zero Real Meta Account Required)
Pingza includes comprehensive test mocks for Meta Graph API token exchange, inspection, and webhooks:

```bash
# 1. Run all unit and integration tests across the monorepo
pnpm test

# 2. Run API integration tests specifically for WhatsApp Account & Embedded Signup
pnpm --filter @whatsapp-saas/api test src/__tests__/whatsapp_accounts.integration.test.ts

# 3. Run Web frontend tests specifically for Embedded Signup hook and UI
pnpm --filter @whatsapp-saas/web test src/__tests__/embedded_signup.test.tsx
```

### End-to-End Testing with Local UI
1. Start MongoDB:
   Local MongoDB running on `mongodb://localhost:27017/whatsapp_saas_dev`.
2. Start services:
   ```bash
   pnpm dev
   ```
3. Navigate to `http://localhost:3000/whatsapp-accounts`:
   - Observe the **Connect WhatsApp** primary button (triggers Embedded Signup v4).
   - Observe the **Manual Setup** secondary button (for administrator / staging fallback with direct tokens).
   - Test connection states: `Not connected`, `Connecting...`, `Connected`, and `Failed`.
   - On error or popup closure, observe safe retry mechanisms without data loss.

---

## 6. Verification Summary

All verification gates have passed successfully:
- **`pnpm typecheck`:** Passed across all 8 workspace projects.
- **`pnpm lint`:** Passed with 0 errors and 0 warnings.
- **`pnpm test`:**
  - Backend API tests: **77 passed** across 10 test files.
  - Frontend Web tests: **18 passed** across 5 test files.
  - Total automated tests: **95 passed, 0 failed**.
- **`pnpm build`:** All packages (`domain`, `contracts`, `billing`, `whatsapp-adapter`, `database`, `web`, `worker`, `api`) built successfully.
