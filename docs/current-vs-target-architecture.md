# Current vs Target Architecture

| Capability | Before | Target | Status after this pass |
| --- | --- | --- | --- |
| Tenancy / RBAC | Workspace + membership + role middleware | Same, plus audit trail | Audit events added for financial actions |
| Subscription / trial | none | versioned plans, 7-day trial, status machine, server-side entitlements | **Implemented** (backend) |
| Wallet / ledger | none | double-entry ledger, reservations, idempotent top-up | **Implemented** (backend) |
| Payments | none | provider interface + verified callbacks | HMAC-verified callback only; no live provider |
| WhatsApp onboarding | Embedded Signup v4, encrypted tokens | same | Unchanged |
| Contacts / consent | consent flag + suppression flag | consent event history, suppression list | Not implemented |
| Campaigns | synchronous in-process sender | validate → reserve → outbox → BullMQ workers, pause/resume, retries, uncertain-outcome handling | **Not implemented** (dispatch gated by subscription only) |
| Webhooks | HMAC verify, persist, dedupe | + status state machine, usage events | Not implemented |
| Usage / pricing | none | usage events, versioned pricing, reconciliation | Not implemented |
| Frontend billing | shell | subscription, wallet, top-ups, history | Subscription/wallet page wired to real APIs |
| Ops | health probes | metrics, DLQ, reconciliation jobs, runbooks | Not implemented |

```
Web (React) -> API (Express) -> MongoDB replica set (transactions) <- Worker (BullMQ, planned)
                  |  billing module: subscription, entitlements, wallet, ledger
                  +-> PaymentProvider (interface)    +-> Meta Cloud API (adapter)
```
