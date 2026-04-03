```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScrapingTask } from './scraping-task.entity';
import { ScrapingJob } from './scraping-job.entity';

@Entity('scraping_results')
export class ScrapingResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => ScrapingTask, (task) => task.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: ScrapingTask;

  @Column({ name: 'job_id' })
  jobId: string;

  @ManyToOne(() => ScrapingJob, (job) => job.tasks, { onDelete: 'CASCADE' }) // Link to job for direct access
  @JoinColumn({ name: 'job_id' })
  job: ScrapingJob;

  @Column({ type: 'jsonb' })
  data: any; // The extracted JSON data

  @CreateDateColumn({ name: 'extracted_at' })
  extractedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```