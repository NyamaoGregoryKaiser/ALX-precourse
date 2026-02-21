```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Dashboard } from './Dashboard';
import { DataSource } from './DataSource';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatterplot';

@Entity()
export class Chart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['bar', 'line', 'pie', 'scatterplot'], default: 'bar' })
  type!: ChartType;

  @Column({ type: 'jsonb' }) // Stores chart specific configuration like { xAxis: 'columnA', yAxis: 'columnB' }
  configuration!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.charts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  dashboardId!: string;

  @ManyToOne(() => Dashboard, (dashboard) => dashboard.charts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboardId' })
  dashboard!: Dashboard;

  @Column()
  dataSourceId!: string;

  @ManyToOne(() => DataSource, (dataSource) => dataSource.charts, { onDelete: 'RESTRICT' }) // Prevent deleting data source if charts depend on it
  @JoinColumn({ name: 'dataSourceId' })
  dataSource!: DataSource;
}
```