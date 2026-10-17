# Product Requirements Document (PRD)

## 1. Product Objective

The **WhatsApp Marketing SaaS Platform** is a multi-tenant B2B application designed to enable businesses, e-commerce retailers, and agencies to run high-converting, compliant WhatsApp messaging campaigns via the official Meta WhatsApp Cloud API.

The platform provides centralized contact directory management, opt-in consent verification, Meta message template lifecycle management, high-throughput broadcast campaign scheduling, delivery telemetry tracking, and tiered subscription usage enforcement.

---

## 2. Target Users & Personas

1. **Growth Marketers / Campaign Managers**:
   - Create, schedule, and monitor bulk promotional and transactional broadcasts.
   - Filter audience segments based on opt-in status, purchase history, and custom tags.
   - Inspect delivery, open (read), and failure metrics to optimize conversion.
2. **E-Commerce & Agency Owners**:
   - Connect and manage multiple verified WhatsApp Business Accounts (WABAs) across separate workspaces.
   - Maintain sender phone number quality ratings (GREEN/YELLOW/RED).
   - Manage monthly messaging quotas and team seats under scalable subscription plans.
3. **Platform Super Administrators**:
   - Oversee cross-tenant operations, global message dispatch rates, account suspensions, and compliance audits.

---

## 3. MVP Scope (Phase 1 to Phase 6 Summary)

- **Multi-Tenant Foundation & Workspaces** (Phase 1 & 2): Workspace isolation, team invitations, role-based access control (Owner, Admin, Member, Viewer).
- **Meta Cloud API Account Integration** (Phase 3): Embedded Signup, WABA token management, webhook subscription handshake.
- **Audience & Contact Management** (Phase 3): Bulk CSV/Excel ingestion, international E.164 phone number normalization, opt-in consent records.
- **Template Lifecycle Management** (Phase 3): Dynamic template composition (Header, Body, Footer, Interactive Buttons), Meta submission, and status polling.
- **Broadcast Campaign Engine** (Phase 4): High-concurrency job queuing via Redis and BullMQ, batch chunking, per-second rate limiting, automated retries.
- **Analytics & Delivery Telemetry** (Phase 4): Webhook status ingestion (`sent`, `delivered`, `read`, `failed`), real-time delivery funnels, conversion tracking.
- **Billing & Quota Metering** (Phase 5): Stripe checkout subscriptions, monthly message caps, automated overage controls.

---

## 4. Out-of-Scope for Initial Release (V1.0)

- Peer-to-peer 1-on-1 two-way customer support chat inbox (Live Chat Widget).
- Automated AI chatbot conversational builder.
- Unofficial WhatsApp Web scraping or QR-code based unofficial gateways (Strictly prohibited; only official Meta Cloud API is supported).
- Multi-channel SMS or Email fallback routing (WhatsApp native only for initial MVP).

---

## 5. V1.0 Acceptance Criteria

1. **Tenant Isolation**: No database query or API endpoint shall ever return or mutate records belonging to a different workspace.
2. **Delivery Reliability**: The broadcast worker pool must process 10,000 messages in under 5 minutes without queue drops or memory leaks.
3. **Meta Policy Compliance**: Opt-out keywords (e.g., "STOP") must immediately mark contact records as `opted_out` and block future promotional dispatches.
4. **Availability & Observability**: Health liveness and readiness probes must provide sub-second status with zero false-healthy claims during database downtime.
5. **Security Controls**: Secrets, passwords, and Meta tokens must never appear in application logs or frontend bundles.
