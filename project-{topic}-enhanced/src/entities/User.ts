```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Project } from "./Project";

/**
 * @file User entity definition.
 *
 * This entity represents a user in the system, capable of creating and managing
 * scraping projects. It includes authentication-related fields like username,
 * email, and password, as well as role-based access control.
 */
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true, nullable: false })
  username!: string;

  @Column({ type: "varchar", length: 100, unique: true, nullable: false })
  email!: string;

  @Column({ type: "varchar", nullable: false })
  password!: string;

  @Column({ type: "varchar", length: 20, default: "user", nullable: false })
  role!: "admin" | "user";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => Project, (project) => project.user)
  projects!: Project[];
}
```