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
import { ScrapingJob } from './scraping-job.entity';
import { ScrapingResult } from './scraping-result.entity';

export enum ScrapingTaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('scraping_tasks')
export class ScrapingTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id' })
  jobId: string;

  @ManyToOne(() => ScrapingJob, (job) => job.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: ScrapingJob;

  @Column({ type: 'enum', enum: ScrapingTaskStatus, default: ScrapingTaskStatus.QUEUED })
  status: ScrapingTaskStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ScrapingResult, (result) => result.task)
  results: ScrapingResult[];
}
```