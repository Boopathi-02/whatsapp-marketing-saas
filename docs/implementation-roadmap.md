# Implementation Roadmap

| Step | Scope | Status |
| --- | --- | --- |
| 0 | Audit + decision register | Done |
| 1 | Tenant isolation review | Existing coverage verified; new billing routes get cross-tenant tests |
| 2 | Subscription, plans, trial, entitlements | Done (backend + tests) |
| 3 | Wallet, ledger, reservations, top-up callback | Done (backend + tests) |
| 3b | Subscription/wallet frontend page | Done (see final report for test status) |
| 4 | Onboarding hardening (re-verify Meta docs) | Not started |
| 5 | Consent events, suppression list, service-window checks | Not started |
| 6 | Campaign pipeline: preflight, reservation, outbox, BullMQ workers, retries, DLQ, uncertain outcomes | Not started; largest remaining item |
| 7 | Webhook status machine, usage events, pricing versions, reconciliation | Not started |
| 8 | Remaining frontend (campaign wizard/progress, consent, audit) | Not started |
| 9 | Observability, CI Mongo/Redis services, replica-set compose, runbooks | Not started |

Dependencies: step 6 builds on 2+3 (done) and needs Redis; step 7 follows 6; decisions B1–B6 gate production enablement, not development.
