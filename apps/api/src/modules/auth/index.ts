/**
 * Authentication Module Boundary (Scheduled for Phase 2)
 *
 * Responsibilities:
 * - JWT issuance and rotation (Access & Refresh tokens)
 * - Password hashing (Argon2 / Bcrypt)
 * - Session tracking and revocation
 * - Multi-factor authentication (MFA)
 * - RBAC middleware (Owner, Admin, Member, Viewer)
 */
export const AUTH_MODULE_METADATA = {
  name: 'auth',
  status: 'planned_phase_2',
} as const;
