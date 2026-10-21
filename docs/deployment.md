# Production Deployment & Operations Guide

## 1. Prerequisites Checklist

Before deploying Pingza to production environments:

- [ ] **MongoDB Replica Set:** MongoDB v7.0+ or MongoDB Atlas configured with replica set (required for transactions and change streams).
- [ ] **Redis Cluster:** Redis v7.0+ for BullMQ queues, rate limiting, and real-time state.
- [ ] **Encryption Key Generated:** Cryptographically secure 32-byte hex key (`openssl rand -hex 32`) set in `CREDENTIAL_ENCRYPTION_KEY`.
- [ ] **Meta Developer Dashboard Configuration:**
  - Meta App verified in Meta Business Manager.
  - App Review completed for `whatsapp_business_management` and `whatsapp_business_messaging`.
  - Embedded Signup v4 Configuration ID generated and placed in `META_CONFIG_ID`.
  - Production Webhook URL configured with HTTPS and matching `META_WEBHOOK_VERIFY_TOKEN`.
- [ ] **SSL / TLS Termination:** Valid certificates for API domain (`api.pingza.com`) and Web app domain (`app.pingza.com`).

---

## 2. Monorepo Build Pipeline

Build all workspace packages in topological dependency order:

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Type-check all workspaces
pnpm typecheck

# 3. Lint all code
pnpm lint

# 4. Run automated test suites
pnpm test

# 5. Build production bundles
pnpm build
```

---

## 3. Starting Services

### Development Mode
```bash
# Start both API and Web concurrently
pnpm dev

# Or start individually:
pnpm dev:api      # Starts API on http://localhost:4000
pnpm dev:web      # Starts Web on http://localhost:3000
pnpm dev:worker   # Starts background worker
```

### Production Mode
```bash
# Start API Gateway (behind reverse proxy / NGINX / Cloudflare)
node apps/api/dist/server.js

# Start Background Campaign Worker
node apps/worker/dist/worker.js

# Serve Web Static Files (via NGINX or static CDN like Cloudflare Pages / AWS S3 + CloudFront)
# Static root: apps/web/dist
```

---

## 4. Database Backup, Migration & Rollback Procedures

### Backup Procedure
Execute regular automated snapshots:
```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/pingza_production" --archive="pingza_backup_$(date +%Y%m%d_%H%M%S).gz" --gzip
```

### Database Migration Policy
1. Models feature additive, non-breaking schema definitions with backward-compatible defaults.
2. If index modifications are introduced, ensure indexes are built with `{ background: true }`.
3. When rotating `CREDENTIAL_ENCRYPTION_KEY`, use a dual-key re-encryption script to decrypt records with the old key and re-encrypt with the new key without downtime.

---

## 5. Health Checks & Observability

- **API Liveness / Readiness:** `GET /api/v1/health`
  - Returns HTTP 200 with `{ status: 'ok', timestamp, uptime, environment }`.
  - Monitors MongoDB connectivity and memory thresholds.
- **Worker Health:** Standalone process logs heartbeat and queue event metrics.

## Billing / Wallet Deployment Requirements

- **MongoDB must be a replica set** (single-node is fine). Wallet operations use multi-document transactions and intentionally refuse to run without them. Use a `?replicaSet=` URI.
- **Indexes:** `autoIndex` is off, so the API calls `ensureIndexes()` at startup and refuses to boot if financial unique indexes (ledger/reservation idempotency keys, one wallet per tenant/currency, one payment per provider reference) cannot be created. Existing duplicate data in non-financial collections only logs a warning; resolve it, because those unique constraints (e.g. user email, webhook event id) are otherwise unenforced.
- Set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET` once a provider is chosen. `PAYMENT_PROVIDER=test` is ignored when `NODE_ENV=production`.
- Rollback: the new collections (`planversions`, `subscriptions`, `walletaccounts`, `ledgerentries`, `walletreservations`, `paymenttransactions`, `auditevents`) are additive. Rolling the application back leaves them unused; do not drop `ledgerentries` once real money has moved.
- Trial expiry is enforced from timestamps at request/dispatch time. A scheduled job calling `SubscriptionRepository.expireDueTrials(now)` (not yet wired) only persists the state and sends notifications.
