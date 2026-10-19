import { Types } from 'mongoose';
import { WebhookEventModel, IWebhookEvent } from '../models/webhook_event.model.js';

export class WebhookEventRepository {
  /**
   * Durably records an incoming webhook event with deduplication.
   * If an event with the same providerEventId already exists, returns the existing record with isDuplicate: true.
   */
  static async recordEvent(
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
    workspaceId?: string | null
  ): Promise<{ event: IWebhookEvent; isDuplicate: boolean }> {
    const existing = await WebhookEventModel.findOne({ providerEventId });
    if (existing) {
      return { event: existing, isDuplicate: true };
    }

    try {
      const event = await WebhookEventModel.create({
        providerEventId,
        eventType,
        payload,
        workspaceId: workspaceId && Types.ObjectId.isValid(workspaceId) ? new Types.ObjectId(workspaceId) : null,
        processed: false,
        receivedAt: new Date(),
      });
      return { event, isDuplicate: false };
    } catch (err: unknown) {
      // Catch concurrent insert race condition (duplicate key error code 11000)
      const errorObj = err as { code?: number };
      if (errorObj?.code === 11000) {
        const raceExisting = await WebhookEventModel.findOne({ providerEventId });
        if (raceExisting) {
          return { event: raceExisting, isDuplicate: true };
        }
      }
      throw err;
    }
  }

  /**
   * Mark an event as successfully processed.
   */
  static async markProcessed(eventId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(eventId)) return false;

    const res = await WebhookEventModel.updateOne(
      { _id: new Types.ObjectId(eventId) },
      {
        $set: {
          processed: true,
          status: 'processed',
          processedAt: new Date(),
        },
        $inc: { attempts: 1 },
      }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Mark an event as failed with error trace.
   */
  static async markFailed(eventId: string, errorMessage: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(eventId)) return false;

    const res = await WebhookEventModel.updateOne(
      { _id: new Types.ObjectId(eventId) },
      {
        $set: {
          status: 'failed',
          lastError: errorMessage,
        },
        $inc: { attempts: 1 },
      }
    );
    return res.modifiedCount > 0;
  }

  /**
   * List recent webhook events.
   */
  static async listRecent(workspaceId?: string, limit = 50): Promise<IWebhookEvent[]> {
    const query: Record<string, unknown> = {};
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
      query.workspaceId = new Types.ObjectId(workspaceId);
    }
    return WebhookEventModel.find(query).sort({ receivedAt: -1 }).limit(limit);
  }
}
