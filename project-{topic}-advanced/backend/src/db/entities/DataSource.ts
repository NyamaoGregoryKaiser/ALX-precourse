import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Visualization } from './Visualization';

export enum DataSourceType {
  CSV_MOCK = 'CSV_MOCK', // For simplicity, we use a mock CSV file
  // POSTGRES = 'POSTGRES',
  // API = 'API',
}

@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: DataSourceType,
    default: DataSourceType.CSV_MOCK,
  })
  type!: DataSourceType;

  // Configuration for the data source (e.g., file path for CSV, connection string for DB, API endpoint)
  @Column({ type: 'jsonb', nullable: true })
  config!: any;

  @ManyToOne(() => User, user => user.dataSources, { onDelete: 'CASCADE' })
  owner!: User;

  @Column()
  ownerId!: string;

  @OneToMany(() => Visualization, visualization => visualization.dataSource)
  visualizations!: Visualization[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}