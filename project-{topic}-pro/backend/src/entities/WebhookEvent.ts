import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WebhookEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_SUCCESS = 'refund.success',
  // ... other event types
}

export enum WebhookEventStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WebhookEventType })
  eventType: WebhookEventType;

  @Column()
  resourceId: string; // ID of the resource (e.g., Payment ID) that triggered the event

  @Column({ type: 'jsonb' })
  payload: object; // Full data to send to the webhook URL

  @Column()
  webhookUrl: string; // The URL to send the webhook to (from Merchant settings)

  @Column({ nullable: true })
  merchantId: string; // For which merchant is this event

  @Column({ type: 'enum', enum: WebhookEventStatus, default: WebhookEventStatus.PENDING })
  status: WebhookEventStatus;

  @Column({ default: 0 })
  retryAttempts: number;

  @Column({ nullable: true })
  lastAttemptAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}