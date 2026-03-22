```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { SlowQuery } from './SlowQuery';

export enum QueryPlanFormat {
  JSON = 'json',
  TEXT = 'text',
  XML = 'xml',
}

@Entity('query_plans')
export class QueryPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SlowQuery, (slowQuery) => slowQuery.queryPlans, { onDelete: 'CASCADE' })
  slowQuery!: SlowQuery;

  @Column({ name: 'slow_query_id' })
  slowQueryId!: string;

  @Column('jsonb')
  planData!: object; // Stores the output of EXPLAIN (ANALYZE) from the actual database

  @Column({ type: 'enum', enum: QueryPlanFormat, default: QueryPlanFormat.JSON })
  format!: QueryPlanFormat;

  @Column({ name: 'total_cost', type: 'numeric', nullable: true })
  totalCost?: number; // Extracted from planData for quick overview

  @Column({ name: 'actual_rows', type: 'numeric', nullable: true })
  actualRows?: number; // Extracted from planData

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;
}
```

#### `backend/src/entities/QuerySuggestion.ts`