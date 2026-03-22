```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { SlowQuery } from './SlowQuery';

export enum SuggestionType {
  INDEX = 'index_creation',
  QUERY_REWRITE = 'query_rewrite',
  PARTITIONING = 'partitioning',
  STATISTICS = 'statistics_update',
  OTHER = 'other',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  DISMISSED = 'dismissed',
}

@Entity('query_suggestions')
export class QuerySuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SlowQuery, (slowQuery) => slowQuery.querySuggestions, { onDelete: 'CASCADE' })
  slowQuery!: SlowQuery;

  @Column({ name: 'slow_query_id' })
  slowQueryId!: string;

  @Column({ type: 'enum', enum: SuggestionType })
  type!: SuggestionType;

  @Column('text')
  description!: string; // Human-readable explanation of the suggestion

  @Column('text', { nullable: true })
  sqlStatement?: string; // e.g., 'CREATE INDEX ...' or a suggested rewritten query

  @Column({ type: 'enum', enum: SuggestionStatus, default: SuggestionStatus.PENDING })
  status!: SuggestionStatus;

  @CreateDateColumn({ name: 'suggested_at' })
  suggestedAt!: Date;

  @Column({ name: 'applied_at', nullable: true })
  appliedAt?: Date;

  @Column({ name: 'dismissed_at', nullable: true })
  dismissedAt?: Date;

  @Column({ name: 'feedback', type: 'text', nullable: true })
  feedback?: string; // User feedback on the suggestion
}
```

#### `backend/src/database/migrations/1701000000000-InitialSchema.ts` (Example Migration)