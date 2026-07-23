import { PrismaClient } from "../generated/client/index.js";
import { logger } from "../logger.js";
import { WebhookDispatcherService } from "./webhook-dispatcher.service.js";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export interface WebhookPayload {
  eventType: string;
  streamId: string | null;
  txHash: string;
  sender: string;
  receiver: string;
  amount: string;
  timestamp: string;
}

export class WebhookService {
  /**
   * Triggers registered webhooks for a given stream event
   */
  async trigger(payload: WebhookPayload): Promise<void> {
    try {
      const activeWebhooks = await (prisma as unknown as { webhook: { findMany: (arg: { where: { isActive: boolean } }) => Promise<{ id: string; url: string; secretKey: string }[]> } }).webhook.findMany({
        where: { isActive: true },
      });

      if (activeWebhooks.length === 0) {
        logger.debug("No active webhooks found to trigger.");
        return;
      }

      logger.info(`Triggering ${activeWebhooks.length} webhooks for stream ${payload.streamId || payload.txHash}`);

      const body = JSON.stringify(payload);

      const requests = activeWebhooks.map(async (webhook: { id: string; url: string; secretKey: string }) => {
        try {
          const timestamp = new Date().toISOString();
          const nonce = randomBytes(16).toString("hex");
          const signature = WebhookDispatcherService.signPayload(
            body,
            webhook.secretKey,
            timestamp,
            nonce
          );

          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-StellarStream-Signature": signature,
              "X-StellarStream-Timestamp": timestamp,
              "X-StellarStream-Nonce": nonce,
              "X-Webhook-ID": webhook.id,
              "User-Agent": "StellarStream-Webhook-Service/1.0",
            },
            body,
          });

          if (!response.ok) {
            logger.warn(`Webhook delivery failed for ${webhook.url}`, {
              status: response.status,
              statusText: response.statusText,
            });
          } else {
            logger.info(`Successfully delivered webhook to ${webhook.url}`);
          }
        } catch (error) {
          logger.error(`Error delivering webhook to ${webhook.url}`, error);
        }
      });

      // We don't want to block the main event loop too long, 
      // but we wait for all to settle in this alpha implementation.
      await Promise.allSettled(requests);
    } catch (error) {
      logger.error("Failed to trigger webhooks", error);
    }
  }
}
