import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany } from 'typeorm';
import { User } from './User.entity';
import { DataSource } from './DataSource.entity';
import { Dashboard } from './Dashboard.entity';
import { ChartType } from '../../types/chart.types'; // Define ChartType enum

@Entity('charts')
export class Chart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ChartType,
    default: ChartType.BAR,
  })
  type!: ChartType;

  @ManyToOne(() => DataSource, (dataSource) => dataSource.charts, { onDelete: 'SET NULL', nullable: true })
  dataSource!: DataSource | null; // Can be null if manual data input or future features

  @Column({ nullable: true })
  dataSourceId!: string | null;

  @Column({ type: 'text', nullable: true }) // SQL query string
  query?: string;

  // JSON configuration for charting library (e.g., ECharts options)
  @Column({ type: 'jsonb' })
  configuration!: string; // Stored as stringified JSON

  @ManyToOne(() => User, (user) => user.charts, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToMany(() => Dashboard, (dashboard) => dashboard.charts)
  dashboards!: Dashboard[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}