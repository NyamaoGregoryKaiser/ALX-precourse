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
import { User } from "./User";
import { ScrapingTask } from "./ScrapingTask";
import { ScrapingResult } from "./ScrapingResult";

/**
 * @file Project entity definition.
 *
 * This entity represents a scraping project, which groups related scraping tasks.
 * Each project belongs to a user and has a name and description.
 */
@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true, nullable: false })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @OneToMany(() => ScrapingTask, (task) => task.project)
  scrapingTasks!: ScrapingTask[];

  @OneToMany(() => ScrapingResult, (result) => result.project)
  scrapingResults!: ScrapingResult[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
```