```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Chart } from './Chart';

@Entity()
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['csv', 'database'], default: 'csv' }) // Extend with 'mongodb', 's3', etc.
  type!: 'csv' | 'database';

  @Column({ type: 'jsonb', nullable: true }) // Store connection string, file path, etc.
  configuration?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.dataSources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Chart, (chart) => chart.dataSource)
  charts!: Chart[];
}
```