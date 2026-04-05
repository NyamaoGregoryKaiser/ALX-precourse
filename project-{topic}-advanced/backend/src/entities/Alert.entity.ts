```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Monitor } from './Monitor.entity';

export enum AlertType {
  RESPONSE_TIME = 'response_time',
  STATUS_CODE = 'status_code',
}

export enum AlertCondition {
  GT = 'gt', // Greater Than
  GTE = 'gte', // Greater Than or Equal
  LT = 'lt', // Less Than
  LTE = 'lte', // Less Than or Equal
  EQ = 'eq', // Equal
  NEQ = 'neq', // Not Equal
}

export enum AlertStatus {
  OK = 'ok',
  ALERT = 'alert',
  RESOLVED = 'resolved',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'monitor_id', type: 'uuid', nullable: false })
  monitorId!: string;

  @ManyToOne(() => Monitor, monitor => monitor.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @Column({ type: 'enum', enum: AlertType, nullable: false })
  type!: AlertType;

  @Column({ type: 'integer', nullable: false })
  threshold!: number; // e.g., 500ms for response time, 400 for status code

  @Column({ type: 'enum', enum: AlertCondition, nullable: false })
  condition!: AlertCondition;

  @Column({ type: 'text', nullable: true })
  message?: string; // Custom message for the alert

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  isActive!: boolean;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.OK, nullable: false })
  status!: AlertStatus; // Current status of the alert configuration

  @Column({ name: 'last_triggered_at', type: 'timestamp', nullable: true })
  lastTriggeredAt?: Date; // When the alert last changed to 'alert' status

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
```