```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DataSource } from './DataSource';
import { Visualization } from './Visualization';

@Entity('datasets')
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  query!: string; // SQL query, collection name, or specific identifier for the data source

  @Column('jsonb', { nullable: true })
  schema!: Record<string, any>; // Inferred or defined schema of the dataset

  @Column({ nullable: true })
  description!: string;

  @ManyToOne(() => DataSource, dataSource => dataSource.datasets)
  dataSource!: DataSource;

  @Column({ name: 'data_source_id' })
  dataSourceId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Visualization, visualization => visualization.dataset)
  visualizations!: Visualization[];
}
```