```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Length, IsUUID } from 'class-validator';
import { User } from './User';
import { MetricDefinition } from './MetricDefinition';

@Entity()
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Length(3, 100, { message: 'Service name must be between 3 and 100 characters' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ unique: true })
  @IsUUID('4', { message: 'API Key must be a valid UUIDv4' }) // API keys are UUIDs for simplicity
  apiKey!: string; // Used by external services to submit data

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.services, { onDelete: 'CASCADE' })
  user!: User;

  @OneToMany(() => MetricDefinition, (metricDefinition) => metricDefinition.service)
  metricDefinitions!: MetricDefinition[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```