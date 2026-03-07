```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Dataset } from './Dataset';

export enum DataSourceType {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MONGODB = 'mongodb', // Not fully implemented, for future expansion
  CSV_UPLOAD = 'csv_upload', // Mocked for now
  JSON_UPLOAD = 'json_upload', // Mocked for now
}

@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: DataSourceType })
  type!: DataSourceType;

  @Column('jsonb', { nullable: true })
  connectionConfig!: Record<string, any>; // Stores host, port, user, password, dbName, etc.

  @Column({ nullable: true })
  description!: string;

  @ManyToOne(() => User, user => user.dataSources)
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Dataset, dataset => dataset.dataSource)
  datasets!: Dataset[];
}
```