```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Dataset } from './Dataset';
import { Dashboard } from './Dashboard';

export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  AREA = 'area',
  TABLE = 'table',
  GAUGE = 'gauge',
}

@Entity('visualizations')
export class Visualization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ChartType })
  chartType!: ChartType;

  @Column('jsonb')
  configuration!: Record<string, any>; // E.g., { xField: 'sales', yField: 'month', seriesField: 'category' }

  @Column('jsonb', { nullable: true })
  dataMapping!: Record<string, any>; // Map dataset fields to chart properties

  @Column({ nullable: true })
  description!: string;

  @ManyToOne(() => Dataset, dataset => dataset.visualizations)
  dataset!: Dataset;

  @Column({ name: 'dataset_id' })
  datasetId!: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.visualizations, { nullable: true })
  dashboard!: Dashboard | null;

  @Column({ name: 'dashboard_id', nullable: true })
  dashboardId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```