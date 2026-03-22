```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Database } from './Database';
import { QueryPlan } from './QueryPlan';
import { QuerySuggestion } from './QuerySuggestion';

@Entity('slow_queries')
export class SlowQuery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  query!: string;

  @Column({ name: 'execution_time_ms', type: 'numeric' })
  executionTimeMs!: number;

  @Column({ name: 'client_application', nullable: true })
  clientApplication?: string;

  @Column({ name: 'client_hostname', nullable: true })
  clientHostname?: string;

  @ManyToOne(() => Database, (database) => database.slowQueries, { onDelete: 'CASCADE' })
  database!: Database;

  @Column({ name: 'database_id' })
  databaseId!: string;

  @ManyToOne(() => User, (user) => user.reportedQueries, { nullable: true })
  reporter?: User; // The user who reported/registered this query, if applicable

  @Column({ name: 'reporter_id', nullable: true })
  reporterId?: string;

  @CreateDateColumn({ name: 'reported_at' })
  reportedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => QueryPlan, (plan) => plan.slowQuery, { cascade: true })
  queryPlans!: QueryPlan[];

  @OneToMany(() => QuerySuggestion, (suggestion) => suggestion.slowQuery, { cascade: true })
  querySuggestions!: QuerySuggestion[];
}
```

#### `backend/src/entities/QueryPlan.ts`