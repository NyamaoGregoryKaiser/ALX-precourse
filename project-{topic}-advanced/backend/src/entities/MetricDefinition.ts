```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Length, IsString, IsOptional, IsJSON, IsObject } from 'class-validator';
import { Service } from './Service';
import { DataPoint } from './DataPoint';

export enum MetricType {
  LATENCY = 'latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  CUSTOM_GAUGE = 'custom_gauge',
  CUSTOM_COUNTER = 'custom_counter',
}

@Entity()
@Unique(['service', 'name'])
export class MetricDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  serviceId!: string;

  @ManyToOne(() => Service, (service) => service.metricDefinitions, { onDelete: 'CASCADE' })
  service!: Service;

  @Column()
  @Length(3, 100, { message: 'Metric name must be between 3 and 100 characters' })
  name!: string;

  @Column({ type: 'enum', enum: MetricType, default: MetricType.CUSTOM_GAUGE })
  @IsString()
  type!: MetricType;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string; // e.g., 'ms', '%', 'count/sec'

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON() // Stored as JSON string
  @IsObject() // After parsing, should be an object
  thresholds?: {
    warning?: number;
    critical?: number;
    [key: string]: any; // Allows for additional custom threshold types
  }; // { warning: 100, critical: 200 } for latency in ms

  @OneToMany(() => DataPoint, (dataPoint) => dataPoint.metricDefinition)
  dataPoints!: DataPoint[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```