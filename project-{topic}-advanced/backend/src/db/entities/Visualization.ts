import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Dashboard } from './Dashboard';
import { DataSource } from './DataSource';

export enum VisualizationType {
  BAR_CHART = 'BAR_CHART',
  LINE_CHART = 'LINE_CHART',
  PIE_CHART = 'PIE_CHART',
  // TABLE = 'TABLE',
}

@Entity('visualizations')
export class Visualization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: VisualizationType,
  })
  type!: VisualizationType;

  // Configuration specific to the visualization type (e.g., x-axis, y-axis, colors)
  @Column({ type: 'jsonb', nullable: true })
  config!: any;

  // Data processing query (e.g., { aggregate: 'SUM', column: 'sales', groupBy: 'category' })
  @Column({ type: 'jsonb', nullable: true })
  query!: any;

  @ManyToOne(() => Dashboard, dashboard => dashboard.visualizations, { onDelete: 'CASCADE' })
  dashboard!: Dashboard;

  @Column()
  dashboardId!: string;

  @ManyToOne(() => DataSource, dataSource => dataSource.visualizations, { onDelete: 'SET NULL' })
  dataSource!: DataSource;

  @Column({ nullable: true }) // Allows data source to be optional or set to null on delete
  dataSourceId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}