import { Request, Response, NextFunction } from 'express';
import {
  TopUpRequestSchema,
  AdjustmentRequestSchema,
  ListTransactionsQuerySchema,
  PaymentCallbackSchema,
  ErrorCode,
} from '@whatsapp-saas/contracts';
import { isValidObjectId } from '@whatsapp-saas/database';
import { BillingService } from './billing.service.js';
import { WalletService } from './wallet.service.js';
import { verifySignature } from './payment.provider.js';
import { env } from '../../config/env.js';
import { sendSuccess } from '../../utils/response.js';
import { AppError } from '../../utils/errors.js';

const ws = (req: Request): string => req.workspace!._id.toString();

function objectIdParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || !isValidObjectId(v)) {
    throw new AppError(`Invalid ${name}.`, 400, ErrorCode.BAD_REQUEST);
  }
  return v;
}

export class BillingController {
  static async subscription(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await BillingService.getSubscription(ws(req)), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async entitlements(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await BillingService.getEntitlements(ws(req)), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async plans(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await BillingService.listPlans(), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static checkout(_req: Request, _res: Response, next: NextFunction) {
    try {
      BillingService.checkout();
    } catch (e) {
      next(e);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await BillingService.cancel(ws(req), req.user!.id), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async wallet(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = typeof req.query.currency === 'string' ? req.query.currency : undefined;
      sendSuccess(res, await WalletService.getWallet(ws(req), currency), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async transactions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = ListTransactionsQuerySchema.parse(req.query);
      sendSuccess(res, await WalletService.listTransactions(ws(req), q), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async topUps(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await WalletService.listPayments(ws(req)), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async createTopUp(req: Request, res: Response, next: NextFunction) {
    try {
      const body = TopUpRequestSchema.parse(req.body);
      sendSuccess(res, await WalletService.initiateTopUp(ws(req), req.user!.id, body), 201, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async getTopUp(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await WalletService.getPayment(ws(req), objectIdParam(req, 'paymentId')), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async adjust(req: Request, res: Response, next: NextFunction) {
    try {
      const body = AdjustmentRequestSchema.parse(req.body);
      sendSuccess(res, await WalletService.adjust(ws(req), req.user!.id, body), 201, req.id);
    } catch (e) {
      next(e);
    }
  }

  static async reconcile(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await WalletService.reconcile(ws(req)), 200, req.id);
    } catch (e) {
      next(e);
    }
  }

  /** Public, server-to-server. Authenticated solely by HMAC signature over the raw body. */
  static async paymentCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = (req as { rawBody?: Buffer }).rawBody;
      const sig = req.header('x-payment-signature') ?? undefined;
      if (!verifySignature(raw, sig, env.PAYMENT_WEBHOOK_SECRET)) {
        throw new AppError('Invalid payment callback signature.', 401, ErrorCode.INVALID_SIGNATURE);
      }
      const cb = PaymentCallbackSchema.parse(req.body);
      const provider = env.PAYMENT_PROVIDER;
      if (provider === 'none') {
        throw new AppError('No payment provider configured.', 503, ErrorCode.PAYMENT_PROVIDER_NOT_CONFIGURED);
      }
      sendSuccess(res, await WalletService.handlePaymentCallback(provider, cb), 200, req.id);
    } catch (e) {
      next(e);
    }
  }
}
