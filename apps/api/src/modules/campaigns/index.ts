/**
 * Campaigns Module Boundary (Scheduled for Phase 4)
 *
 * Responsibilities:
 * - Campaign configuration, audience filtering, and scheduling
 * - Dispatching bulk sending jobs to Redis/BullMQ worker queues
 * - Delivery, read and failure metric aggregation
 */
export const CAMPAIGNS_MODULE_METADATA = {
  name: 'campaigns',
  status: 'planned_phase_4',
} as const;
