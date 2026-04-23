import { AppDataSource } from '../../ormconfig';
import { WebhookEvent, WebhookEventStatus } from '../entities/WebhookEvent';
import { Repository } from 'typeorm';
import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

export class WebhookService {
  private webhookEventRepository: Repository<WebhookEvent>;

  constructor() {
    this.webhookEventRepository = AppDataSource.getRepository(WebhookEvent);
  }

  // This method would typically be called by a cron job or message queue listener
  // to process pending webhooks.
  async processPendingWebhooks(): Promise<void> {
    const pendingEvents = await this.webhookEventRepository.find({
      where: { status: WebhookEventStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 10, // Process in batches
    });

    for (const event of pendingEvents) {
      await this.sendWebhook(event);
    }
  }

  async sendWebhook(event: WebhookEvent): Promise<void> {
    try {
      logger.info(`Attempting to send webhook event ${event.id} to ${event.webhookUrl}`);

      // In a real system, you'd sign the payload with the merchant's secret key
      // const signature = crypto.createHmac('sha256', config.webhookSecret).update(JSON.stringify(event.payload)).digest('hex');

      await axios.post(event.webhookUrl, event.payload, {
        headers: {
          'Content-Type': 'application/json',
          // 'X-Webhook-Signature': signature, // Include signature for verification
        },
        timeout: 5000, // 5 second timeout
      });

      event.status = WebhookEventStatus.SENT;
      event.lastAttemptAt = new Date();
      await this.webhookEventRepository.save(event);
      logger.info(`Webhook event ${event.id} sent successfully.`);
    } catch (error: any) {
      event.retryAttempts += 1;
      event.lastAttemptAt = new Date();
      if (event.retryAttempts >= 5) { // Max 5 retries
        event.status = WebhookEventStatus.FAILED;
        logger.error(`Webhook event ${event.id} failed after multiple retries.`, error.message);
      } else {
        event.status = WebhookEventStatus.RETRYING;
        logger.warn(`Webhook event ${event.id} failed, retrying (${event.retryAttempts}):`, error.message);
      }
      await this.webhookEventRepository.save(event);
    }
  }
}