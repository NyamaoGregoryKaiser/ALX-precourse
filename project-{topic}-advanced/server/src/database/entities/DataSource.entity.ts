import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User.entity';
import { DataSourceType } from '../../types/dataSource.types';
import { Chart } from './Chart.entity';

@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: DataSourceType,
    default: DataSourceType.POSTGRESQL,
  })
  type!: DataSourceType;

  // Encrypted connection details (e.g., host, port, user, password, db name)
  @Column({ type: 'text' })
  connectionDetails!: string;

  @ManyToOne(() => User, (user) => user.dataSources, { onDelete: 'CASCADE' })
  user!: User;

  @OneToMany(() => Chart, (chart) => chart.dataSource)
  charts!: Chart[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}