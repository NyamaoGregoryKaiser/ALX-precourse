```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ScrapingTask } from "./ScrapingTask";
import { Project } from "./Project";

/**
 * @file ScrapingResult entity definition.
 *
 * This entity stores the output of a completed scraping task, including
 * the extracted data, the task and project it belongs to, and the status
 * of the scraping operation (success or failure).
 */

@Entity("scraping_results")
export class ScrapingResult {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ScrapingTask, (task) => task.scrapingResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "task_id" })
  task!: ScrapingTask;

  @ManyToOne(() => Project, (project) => project.scrapingResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @Column({ type: "jsonb", nullable: false })
  data!: Record<string, any>; // Store the scraped data as a JSON object

  @CreateDateColumn({ name: "scraped_at" })
  scrapedAt!: Date;

  @Column({ type: "varchar", length: 20, default: "success", nullable: false })
  status!: "success" | "failed";

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage!: string | null;
}
```