import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserRole } from '../../types/user.types';
import { DataSource } from './DataSource.entity';
import { Dashboard } from './Dashboard.entity';
import { Chart } from './Chart.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string; // Hashed password

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => DataSource, (dataSource) => dataSource.user)
  dataSources!: DataSource[];

  @OneToMany(() => Dashboard, (dashboard) => dashboard.user)
  dashboards!: Dashboard[];

  @OneToMany(() => Chart, (chart) => chart.user)
  charts!: Chart[];
}