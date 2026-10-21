# Architecture Audit (Phase 0)

Audit date: 2026-10-21. Baseline: `pnpm test` → 19 files / 135 tests passing (API tests need a local MongoDB replica set).

## Stack
| Area | Finding |
| --- | --- |
| Monorepo | pnpm workspaces: `apps/{api,web,worker}`, `packages/{billing,contracts,database,domain,whatsapp-adapter}`. Node >= 20, TypeScript strict. |
| API | Express 4, zod validation, pino logging, helmet, express-rate-limit, argon2, JWT access + HttpOnly refresh cookie. |
| Database | MongoDB via Mongoose 8. Dev instance is a replica set (`rs0`), so multi-document transactions work. `docker-compose.yml` runs a **standalone** `mongo:7.0` (no transactions) and must become a single-node replica set. |
| Frontend | React + Vite + MUI, react-query, react-router v6. Pages exist for Dashboard, Billing, Campaigns, Contacts, Templates, WhatsApp accounts, Team, Settings, Admin. Dashboard uses `demoData.ts` (mock data). |
| Worker | `apps/worker` boots, connects to Mongo, **logs a queue topology and idles**. No BullMQ dependency, no processors. |
| CI | GitHub Actions: lint, format check, typecheck, test, build. CI has no MongoDB service, so API integration tests cannot run there as configured. |

## Tenancy and authorization
- Tenant = `Workspace`. Tenant-owned models carry `workspaceId`; repositories filter by it.
- `requireWorkspace(minRole)` reads `workspaceId` from route param / header / query / body, then **verifies active membership** server-side. The client-supplied id is therefore only a selector, never a grant. Roles: owner > admin > member > viewer.
- Observed gap: `workspaceId` is also accepted from `body`/`query`. Safe because membership is verified, but new routes use the route param only.
- `tenant_isolation.integration.test.ts` covers cross-tenant access for existing modules.
- No audit-event collection existed before this pass.

## Existing functionality
- Auth, sessions, invitations, workspaces, members: complete (Phase 2).
- WhatsApp: Embedded Signup v4 flow, encrypted token storage (AES-256-GCM), account health, webhooks with HMAC verification and persisted/deduplicated events (Phase 3).
- Contacts: E.164 validation, consent status + suppression flag, CSV import/export. **Missing:** consent evidence history, separate suppression list.
- Templates: sync/list. Campaigns: see risks.
- `packages/billing`: hard-coded `TIER_LIMITS` numbers and a zod status enum only. `apps/api/src/modules/billing`: empty placeholder. `BillingPage.tsx`: UI shell.

## Risks found
1. **Campaign dispatch is unsafe for production** (`campaign.service.ts`): sends synchronously in-process; no queue, no idempotency key, no retry classification; a timed-out send is recorded as FAILED (it may have been delivered, so a retry would double-send); no rate limit; no pause/resume; no subscription or wallet gate; a `wamid_${Date.now()}` fallback fabricates provider ids.
2. **No billing enforcement anywhere**: nothing checks trial expiry, plan limits or funds.
3. **`apps/api/src/config/env.ts` has real-looking defaults** for `META_APP_SECRET`, `META_APP_ID`, `META_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`, the JWT secret and the encryption key. In production these must be required (no default). If the Meta secret is real, rotate it. Not changed in this pass; needs an owner decision.
4. Compose Mongo is standalone; transactional code paths need a replica set.
5. Web dashboard shows demo data (guarded by `DemoBanner`).
6. CI lacks Mongo/Redis services.
