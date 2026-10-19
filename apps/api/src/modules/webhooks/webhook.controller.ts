import { Request, Response, NextFunction } from 'express';
import { webhookService } from './webhook.service.js';

export class WebhookController {
  /**
   * Meta GET Verification Handshake.
   * Meta expects raw challenge string returned in response body with 200 OK.
   */
  static handleVerification(req: Request, res: Response, next: NextFunction): void {
    try {
      const mode = req.query['hub.mode'] as string | undefined;
      const token = req.query['hub.verify_token'] as string | undefined;
      const challenge = req.query['hub.challenge'] as string | undefined;

      const verifiedChallenge = webhookService.verifyHandshake(mode, token, challenge);
      res.status(200).send(verifiedChallenge);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Meta POST Event Ingestion.
   * Must acknowledge promptly with 200 OK after durable event persistence.
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const result = await webhookService.ingestWebhook(rawBody, signature, req.body);
      res.status(200).json({
        success: true,
        persisted: result.persisted,
        isDuplicate: result.isDuplicate,
      });
    } catch (error) {
      next(error);
    }
  }
}
