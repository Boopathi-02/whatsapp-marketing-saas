# WhatsApp Marketing SaaS — Secure Auth & Multi-Tenant Architecture (Phase 2)

[![CI Pipeline](https://github.com/Boopathi-02/whatsapp-marketing-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/Boopathi-02/whatsapp-marketing-saas/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

Production-grade, multi-tenant WhatsApp Marketing SaaS platform with secure Argon2id authentication, JWT/HttpOnly refresh token rotation & reuse detection, workspace management, server-side RBAC, and responsive React/MUI dashboard.

---

## 1. Features Implemented

### Authentication & Sessions
- **Argon2id Password Hashing**: State-of-the-art password security (64MB memory cost, 3 iterations, 4 parallelism).
- **Dual-Token Architecture**: Short-lived JWT access tokens + cryptographically random refresh tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Refresh Token Rotation & Family Reuse Detection**: Automatically revokes all sessions in a token family if an already-consumed token is presented.
- **Email Verification & Password Reset**: Secure, single-use, SHA-256 hashed expiring tokens with generic anti-enumeration responses.
- **Session Revocation**: User logout and password reset invalidates all active sessions server-side.
- **Authentication Rate Limiting**: 30 requests per 15-minute window per IP on auth endpoints.

### Multi-Tenant Workspaces
- **Workspace Isolation**: Verified server-side tenant scoping on every workspace endpoint.
- **Role-Based Access Control (RBAC)**: Permission matrix enforcing `owner > admin > member > viewer`.
- **Team Invitations**: Single-use, expiring invitations sent via email with token hashing.
- **Last-Owner Protection**: Invariant preventing removal or demotion of the last remaining workspace owner.
- **Ownership Transfer**: Secure transfer of workspace ownership to active team members.

### React / MUI Frontend
- **Auth Pages**: Login, Registration, Forgot Password, Reset Password, Email Verification, Accept Invitation.
- **Protected Routes**: Unauthenticated users are redirected to `/login`.
- **Workspace Switcher**: Topbar dropdown to switch between authorized workspaces or create new ones.
- **Team Members Management**: View members, invite team members by email, modify roles, and transfer ownership.

---

## 2. Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22.x` recommended, tested on Node 22.22)
- **pnpm**: `v9.x` or higher (`v10.x` recommended, tested on pnpm 10.33)
- **MongoDB**: Local MongoDB instance or Docker container on port `27017`

---

## 3. Quick Start

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Environment Variables

```bash
# On Windows PowerShell:
Copy-Item .env.example .env
```

### Step 3: Run Development Services

```bash
# Run both API and Web Dashboard:
pnpm dev

# Or run individually:
pnpm dev:api   # API at http://localhost:4000
pnpm dev:web   # Web App at http://localhost:3000
pnpm dev:worker # Worker process
```

---

## 4. Verification & Testing

Run all quality checks and automated tests across all 9 packages:

```bash
# Typecheck all packages
pnpm typecheck

# Lint entire codebase (0 errors)
pnpm lint

# Run all 40 automated integration and unit tests
pnpm test

# Build production bundles
pnpm build
```

---

## 5. Project Architecture

```
whatsapp-marketing-saas/
├── apps/
│   ├── web/                     # React 18, Vite, Material UI, AuthContext, ProtectedRoute
│   ├── api/                     # Express.js REST API with auth routes, workspace middleware & error handler
│   └── worker/                  # Standalone background worker process
├── packages/
│   ├── contracts/               # Shared Zod schemas for auth, workspaces, DTOs and API envelopes
│   ├── domain/                  # Domain entities, validation rules, and status enums
│   ├── database/                # Mongoose models (User, Workspace, Member, Session), repositories, transactions
│   ├── whatsapp-adapter/        # Meta Cloud API adapter interfaces
│   └── billing/                 # Plan tier definitions and quota limits
├── docs/                        # Complete architecture, database, API, and security specifications
└── infrastructure/              # Docker Compose configuration for local MongoDB and Redis
```
