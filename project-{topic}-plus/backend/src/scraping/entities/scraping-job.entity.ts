```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScrapingConfigDto } from '../dto/scraping-config.dto';
import { ScrapingTask } from './scraping-task.entity';

export enum ScrapingJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
}

@Entity('scraping_jobs')
export class ScrapingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.scrapingJobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'target_url' })
  targetUrl: string;

  @Column({ type: 'jsonb' })
  config: ScrapingConfigDto; // JSON object defining selectors, attributes, etc.

  @Column({ name: 'schedule_cron', length: 50, nullable: true })
  scheduleCron?: string; // Cron expression for scheduled jobs

  @Column({ type: 'enum', enum: ScrapingJobStatus, default: ScrapingJobStatus.PENDING })
  status: ScrapingJobStatus;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt?: Date;

  @Column({ name: 'next_run_at', type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ScrapingTask, (task) => task.job)
  tasks: ScrapingTask[];
}
```