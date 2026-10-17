/**
 * BullMQ Background Queue Architecture (Phase 4 Implementation Target)
 *
 * This file specifies the queue topology and processor interfaces for asynchronous
 * workloads. In Phase 1, the worker runtime boots, performs health checks, and
 * establishes the operational lifecycle without dispatching actual WhatsApp traffic.
 */

export const QUEUE_NAMES = {
  // Campaign dispatching and chunking
  CAMPAIGN_DISPATCH: 'whatsapp-campaign-dispatch',
  // Per-recipient message sending with rate-limiting
  MESSAGE_TRANSMISSION: 'whatsapp-message-transmission',
  // Incoming Meta webhook delivery status updates (sent, delivered, read, failed)
  WEBHOOK_PROCESSING: 'whatsapp-webhook-processing',
  // Contact CSV/Excel import validation and bulk upserts
  CONTACT_IMPORT: 'whatsapp-contact-import',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface WorkerQueueDefinition {
  name: QueueName;
  concurrency: number;
  rateLimitPerSecond?: number;
  description: string;
}

export const REGISTERED_QUEUES: WorkerQueueDefinition[] = [
  {
    name: QUEUE_NAMES.CAMPAIGN_DISPATCH,
    concurrency: 5,
    description: 'Partitions scheduled campaign contacts into batched message jobs.',
  },
  {
    name: QUEUE_NAMES.MESSAGE_TRANSMISSION,
    concurrency: 20,
    rateLimitPerSecond: 80, // Meta Tier 1 tier rate limit safeguard
    description: 'Dispatches templated messages to the Meta WhatsApp Cloud API.',
  },
  {
    name: QUEUE_NAMES.WEBHOOK_PROCESSING,
    concurrency: 50,
    description: 'Processes status receipts and updates message deliverability records.',
  },
  {
    name: QUEUE_NAMES.CONTACT_IMPORT,
    concurrency: 2,
    description: 'Parses and validates bulk contact uploads asynchronously.',
  },
];
