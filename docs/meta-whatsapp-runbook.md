# Meta WhatsApp Production Operations & Incident Response Runbook

**System:** Pingza Multi-Tenant WhatsApp Platform  
**Applies to:** Production Site Reliability Engineers (SRE), Backend Engineers & Support  

---

## 1. Quick Diagnostic Triage

When WhatsApp messaging or onboarding issues occur, run the following triage commands:

### A. Health Endpoint Check
```bash
curl -i https://api.pingza.com/api/v1/health
```
- Expect HTTP 200 with `{ "status": "ok", "uptime": ..., "environment": "production" }`.

### B. Webhook Handshake Verification
```bash
curl -i "https://api.pingza.com/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_123&hub.verify_token=<META_WEBHOOK_VERIFY_TOKEN>"
```
- Expect HTTP 200 with body `test_123`.

---

## 2. Standard Operating Procedures (SOPs)

### SOP-1: Rotating the Credential Encryption Key (`CREDENTIAL_ENCRYPTION_KEY`)
When rotating master database encryption keys:
1. Ensure the new 32-byte key is generated:
   ```bash
   openssl rand -hex 32
   ```
2. The encryption envelope format is versioned (`v1:iv:authTag:ciphertext`).
3. Deploy a dual-key re-encryption migration:
   - Provide `OLD_CREDENTIAL_ENCRYPTION_KEY` and `NEW_CREDENTIAL_ENCRYPTION_KEY`.
   - Iterate through `whatsappaccounts` collection.
   - Decrypt using the old key, re-encrypt using the new key, and update records atomically.
4. Update `CREDENTIAL_ENCRYPTION_KEY` across all server configurations.
5. Restart API instances.

### SOP-2: Rotating the Meta App Secret (`META_APP_SECRET`)
1. In Meta Developer Dashboard > **App Settings** > **Basic** > **App Secret**.
2. Click **Rotate App Secret**. Meta provides a 24-hour grace period where both old and new secrets are valid.
3. Update `META_APP_SECRET` in production `.env` and secret manager (e.g., AWS Secrets Manager, Vault).
4. Perform a zero-downtime rolling restart of the API cluster.
5. In Meta Developer Dashboard, click **Expire Old Secret**.

### SOP-3: Re-subscribing a Dropped WABA to Webhooks
If a customer reports they are sending/receiving messages on WhatsApp but Pingza is not receiving callbacks:
1. Navigate to **WhatsApp Accounts** in the customer's workspace.
2. Click **Sync Metadata**. This automatically calls `POST /{waba_id}/subscribed_apps` using the customer's decrypted access token.
3. If the token is invalid or expired, prompt the customer to click **Reconnect Account**.

---

## 3. Incident Response Playbooks

### Playbook-1: Webhook HMAC-SHA256 Signature Failures (HTTP 401 Spikes)
- **Alert:** Sudden spike in `401 Invalid webhook cryptographic signature` logs.
- **Root Causes:**
  1. `META_APP_SECRET` was rotated in Meta Dashboard but not updated on the API server.
  2. A reverse proxy or WAF stripped or modified the raw request body bytes before reaching Express.
- **Remediation Steps:**
  1. Inspect raw logs for incoming `X-Hub-Signature-256` header presence.
  2. Verify that `app.ts` middleware preserves `req.rawBody` buffer:
     ```ts
     express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } })
     ```
  3. Verify that `META_APP_SECRET` in server environment exactly matches the active secret in Meta Dashboard.

### Playbook-2: Access Token Expiration / Revocation (Meta Error Code 190)
- **Alert:** API logs show `Meta API error [190]: Error validating access token: Session has expired or user changed password`.
- **Root Causes:**
  - User changed Facebook password.
  - User revoked Pingza permissions in Meta Business Manager.
  - Temporary system user token expired.
- **Remediation Steps:**
  1. The system automatically marks `WhatsAppAccount.status = 'degraded'`.
  2. Inform the customer via email or in-app banner.
  3. Customer clicks **Reconnect Account** to re-authorize via Embedded Signup v4.

### Playbook-3: Phone Number Conflict Between Tenants (HTTP 409 Conflict)
- **Alert:** User receives "This WhatsApp Phone Number ID is already connected to another workspace".
- **Root Causes:**
  - A customer transferred their business phone number or created a second workspace.
  - A previous tenant did not disconnect their account.
- **Remediation Steps:**
  1. Pingza's partial unique index on `{ phoneNumberId: 1 }` prevents double connection.
  2. If legitimate ownership transfer occurred, support verifies ownership with Meta Business Manager and assists in disconnecting the account from the old workspace.

### Playbook-4: Message Delivery Rate-Limit Exceeded (Meta Error Code 130472 / 131056)
- **Alert:** Outbound messages fail with Meta error code `130472` (Rate limit hit).
- **Remediation Steps:**
  1. Meta limits unverified business phone numbers to Tier 1 (1,000 unique recipients in rolling 24 hours).
  2. Guide customer to complete Meta Business Verification in Meta Business Manager to automatically upgrade to Tier 2 (10,000/day), Tier 3 (100,000/day), or Unlimited.
