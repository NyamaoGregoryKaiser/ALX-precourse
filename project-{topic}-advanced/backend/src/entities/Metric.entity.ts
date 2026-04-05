```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Monitor } from './Monitor.entity';

@Entity('metrics')
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'monitor_id', type: 'uuid', nullable: false })
  monitorId!: string;

  @ManyToOne(() => Monitor, monitor => monitor.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
  timestamp!: Date;

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs?: number; // Nullable if connection error

  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode?: number; // Nullable if no HTTP response

  @Column({ name: 'status_text', type: 'varchar', nullable: true })
  statusText?: string;

  @Column({ type: 'text', nullable: true })
  error?: string; // Stores error message if any
}
```