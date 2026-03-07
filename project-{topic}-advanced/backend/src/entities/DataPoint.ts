```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { IsNumber, IsISO8601, IsOptional, IsJSON, IsObject } from 'class-validator';
import { MetricDefinition } from './MetricDefinition';

@Entity()
@Index(['metricDefinition', 'timestamp']) // Optimize queries by metric and time
export class DataPoint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  metricDefinitionId!: string;

  @ManyToOne(() => MetricDefinition, (metricDefinition) => metricDefinition.dataPoints, { onDelete: 'CASCADE' })
  metricDefinition!: MetricDefinition;

  @Column({ type: 'double precision' })
  @IsNumber({}, { message: 'Value must be a number' })
  value!: number;

  @Column({ type: 'timestamp with time zone' })
  @IsISO8601({ strict: true }, { message: 'Timestamp must be a valid ISO 8601 date string' })
  timestamp!: Date;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON() // Stored as JSON string
  @IsObject() // After parsing, should be an object
  metadata?: Record<string, any>; // e.g., { path: '/api/users', statusCode: 200 }

  @CreateDateColumn()
  createdAt!: Date; // Record when the data point was *received* by our system
}
```