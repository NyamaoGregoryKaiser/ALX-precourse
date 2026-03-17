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
} from "typeorm";
import { Project } from "./Project";
import { ScrapingResult } from "./ScrapingResult";

/**
 * @file ScrapingTask entity definition.
 *
 * This entity defines a single scraping task, including its target URL,
 * CSS/XPath selectors for data extraction, scheduling information,
 * and current status. Each task belongs to a project.
 */

// Define the structure for a selector configuration
export interface SelectorConfig {
  name: string;
  selector: string; // CSS selector or XPath
  type?: 'css' | 'xpath'; // Defaults to 'css'
  attribute?: string; // e.g., 'href' for anchor tags, 'src' for images
}

@Entity("scraping_tasks")
export class ScrapingTask {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, (project) => project.scrapingTasks)
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @Column({ name: "target_url", type: "varchar", length: 255, nullable: false })
  targetUrl!: string;

  @Column({ type: "jsonb", nullable: false, default: [] })
  selectors!: SelectorConfig[];

  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
    nullable: false,
  })
  status!: "pending" | "running" | "completed" | "failed" | "cancelled";

  @Column({ name: "schedule_interval", type: "varchar", length: 50, nullable: true })
  scheduleInterval!: string | null; // e.g., "daily", "weekly", "*/5 * * * *" (cron string)

  @Column({ name: "last_run_at", type: "timestamp", nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: "next_run_at", type: "timestamp", nullable: true })
  nextRunAt!: Date | null;

  @Column({ type: "boolean", default: true, nullable: false })
  headless!: boolean; // Whether to run the browser in headless mode

  @OneToMany(() => ScrapingResult, (result) => result.task)
  scrapingResults!: ScrapingResult[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
```