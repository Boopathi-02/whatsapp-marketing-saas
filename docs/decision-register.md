# Decision Register

## 1. Confirmed (fixed by the business)
| # | Decision |
| --- | --- |
| C1 | SaaS subscription + usage-based billing |
| C2 | Customers own their WABA / phone numbers (connected via Meta) |
| C3 | 7-day trial |
| C4 | Prepaid wallet billing |
| C5 | ~10,000 messages/month initial volume (capacity baseline, not a cap) |
| C6 | Backend and frontend both delivered |
| C7 | Customers pay Meta directly; the wallet covers only the platform's own subscription/usage charges |

## 2. Recommended defaults (implemented, configurable, reversible)
| # | Default | Where |
| --- | --- | --- |
| R1 | Keep MongoDB; use multi-document transactions (replica set required in every environment). | `docs/deployment.md`, compose |
| R2 | Money as integer minor units + ISO currency code per wallet; no floats. | `packages/billing/src/money.ts` |
| R3 | Double-entry ledger: every posting has balanced debit/credit lines against the wallet and system accounts. Corrections are compensating postings, never edits. | `packages/billing/src/ledger.ts` |
| R4 | `available = posted - active reservations`. Reservations are rows; `WalletAccount.postedMinor` / `reservedMinor` are maintained in the same transaction, guarded by a conditional update so they cannot go negative. | wallet repository |
| R5 | Trial starts when the workspace is created (lazily for pre-existing workspaces on first billing read). Persisted in UTC. | `TRIAL_DURATION_DAYS` (default 7) |
| R6 | Expired trial / suspended / cancelled: no new launches and dispatch refused at send time (not only by cron). | `evaluateDispatchAccess` |
| R7 | Plans and prices live in the database as versioned plan versions. **No prices are seeded.** Trial entitlements come from env-configurable defaults. | `PlanVersion` |
| R8 | Payment provider behind an interface. Callbacks are HMAC-verified and idempotent by provider event id. No fake success path. | `PAYMENT_WEBHOOK_SECRET` |
| R9 | Manual adjustments require the owner role and write audit events. | wallet service |

## 3. Requires business confirmation (blocks go-live, not development)
| # | Question | Behavior until answered |
| --- | --- | --- |
| B1 | Does the trial include free credit? Must the wallet be funded to send during trial? | No free credit (`TRIAL_FREE_CREDIT_MINOR=0`); funding needed to reserve. |
| B2 | Plan names, prices, intervals, per-message platform fee | Not seeded. Checkout returns `PAYMENT_PROVIDER_NOT_CONFIGURED`. |
| B3 | Do credits expire? Refundable? | Never expire; refunds are owner-approved manual adjustments. |
| B4 | Chargeable event (submission / accepted / delivered) | Not implemented yet (usage accounting is a later phase). |
| B5 | Payment provider and currencies | Not chosen. |
| B6 | Trial expiry with queued/active campaigns | Dispatch refused; campaigns stay resumable after upgrade. Reservation-release policy pending. |
| B7 | Meta marketing-message policy (opt-in evidence, service window, per-category/country pricing) must be re-verified against current Meta docs before launch. | Not asserted in code. |
