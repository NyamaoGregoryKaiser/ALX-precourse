import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { User } from './User.entity';
import { Chart } from './Chart.entity';

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  // JSON structure for responsive-grid-layout
  @Column({ type: 'jsonb', nullable: true })
  layout?: any[];

  @ManyToOne(() => User, (user) => user.dashboards, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToMany(() => Chart, (chart) => chart.dashboards)
  @JoinTable({
    name: 'dashboard_charts', // junction table name
    joinColumn: { name: 'dashboardId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'chartId', referencedColumnName: 'id' },
  })
  charts!: Chart[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}