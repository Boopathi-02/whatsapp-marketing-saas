# WhatsApp Marketing SaaS — Platform Foundation (Phase 1)

[![CI Pipeline](https://github.com/organization/whatsapp-marketing-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/whatsapp-marketing-saas/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

Production-grade, multi-tenant WhatsApp Marketing SaaS foundation built with React, Vite, Material UI, Express.js, TypeScript, Mongoose, Redis/BullMQ queue infrastructure, and Docker Compose.

---

## 1. Prerequisites

Before running the application locally, ensure you have:

- **Node.js**: `v20.0.0` or higher (`v22.x` recommended, tested on Node 22.22)
- **pnpm**: `v9.x` or higher (`v10.x` recommended, tested on pnpm 10.33)
- **Docker & Docker Compose**: Optional for local MongoDB and Redis (see alternative native setup below)

---

## 2. Quick Start

### Step 1: Install Workspace Dependencies

```bash
pnpm install
```

### Step 2: Configure Environment Variables

Copy the template configuration to `.env`:

```bash
# On Linux / macOS / Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

The default values in `.env.example` are pre-configured for local development.

### Step 3: Start Local Infrastructure (Docker)

If Docker is available:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

> **Note**: If Docker is not available in your environment, the application will still run!
> - The API server and health check (`GET /api/v1/health`) start seamlessly in standalone mode.
> - The web dashboard gracefully detects the database state and renders in interactive demo mode without crashing.
> - See [Local Infrastructure Documentation](infrastructure/docker/README.md) for native MongoDB/Redis or cloud options.

### Step 4: Run Development Services

Start both the API server and the Frontend web application concurrently:

```bash
pnpm dev
```

Alternatively, run services individually:

```bash
# Start API only (Runs at http://localhost:4000)
pnpm dev:api

# Start Web Dashboard only (Runs at http://localhost:3000)
pnpm dev:web

# Start Background Worker runtime
pnpm dev:worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application dashboard.

---

## 3. Project Architecture & Workspaces

```
whatsapp-marketing-saas/
├── apps/
│   ├── web/                     # React 18, Vite, Material UI (MUI v6), TanStack Query
│   ├── api/                     # Express.js REST API with Helmet, CORS, Pino logger & Health checks
│   └── worker/                  # Standalone background worker process for BullMQ queue processing
├── packages/
│   ├── contracts/               # Shared Zod schemas, API response envelopes, and DTO contracts
│   ├── domain/                  # Pure domain entities, business models, and status enums
│   ├── database/                # Mongoose connection handling, credential redaction & multi-tenant helpers
│   ├── whatsapp-adapter/        # Meta Cloud API adapter interface and webhook event payloads
│   └── billing/                 # Plan tier definitions, quota limits, and Stripe usage records
├── infrastructure/
│   └── docker/                  # Docker Compose configuration for local MongoDB 7.0 and Redis 7.2
├── docs/                        # Complete architecture, database, API, and security specifications
└── tests/                       # Global testing harness and test runner setup
```

---

## 4. Verification & Testing Commands

Execute automated tests, linting, type checks, and production builds with these root scripts:

```bash
# Run all automated tests (Vitest & Supertest)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Typecheck all TypeScript workspaces
pnpm typecheck

# Run ESLint across entire repository
pnpm lint

# Automatically fix lint issues
pnpm lint:fix

# Check Prettier code formatting
pnpm format:check

# Format code with Prettier
pnpm format

# Build production bundles for all packages and applications
pnpm build
```

---

## 5. API Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Liveness probe (uptime, status, version) | `200 OK` |
| `GET` | `/api/v1/health/ready` | Readiness probe (verifies MongoDB responsiveness) | `200 OK` or `503 Service Unavailable` |

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { "status": "healthy" },
  "requestId": "4c94b595-6b22-4917-a068-1ebefadad611"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid",
    "details": []
  },
  "requestId": "4c94b595-6b22-4917-a068-1ebefadad611"
}
```

---

## 6. Frontend Navigation & Routes

The React dashboard includes 9 routes accessible via the responsive sidebar:

1. **Dashboard** (`/`): Summary cards, interactive message volume funnel chart, recent campaigns, real-time activity feed, and quick actions.
2. **Contacts** (`/contacts`): Audience directory and opt-in consent placeholder.
3. **WhatsApp Accounts** (`/whatsapp-accounts`): Official Meta WABA integration placeholder.
4. **Message Templates** (`/templates`): Meta message template sync placeholder.
5. **Campaigns** (`/campaigns`): Broadcast campaign scheduler placeholder.
6. **Analytics** (`/analytics`): Delivery receipt and conversion telemetry placeholder.
7. **Billing** (`/billing`): Subscription plans and usage quota placeholder.
8. **Settings** (`/settings`): Workspace preferences and organization metadata.
9. **Super Admin** (`/admin`): System administration view, clearly segregated with dev placeholder indicators.

---

## 7. Troubleshooting

### Issue: Port 4000 or 3000 is already in use
- Update `API_PORT` or `WEB_PORT` in your `.env` file.
- The web application Vite proxy automatically points `/api` to the configured backend port.

### Issue: MongoDB connection fails at startup
- In development, the API server handles database unavailability gracefully: it logs a warning and boots into degraded mode so you can test the frontend shell and health endpoints without a running database.
- Start MongoDB using `docker compose -f infrastructure/docker/docker-compose.yml up -d` or verify your native MongoDB service with `mongosh`.

### Issue: Vite CSS / Material UI style clashes
- The project configures Emotion with standard MUI resets and consistent Plus Jakarta Sans typography. Verify that all components import from `@mui/material` and `@mui/icons-material`.

---

## 8. License

Private & Proprietary. All rights reserved.
