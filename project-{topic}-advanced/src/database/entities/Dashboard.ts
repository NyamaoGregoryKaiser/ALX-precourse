```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Visualization } from './Visualization';

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column('jsonb', { nullable: true })
  layout!: Record<string, any>; // Stores layout configuration (e.g., react-grid-layout)

  @ManyToOne(() => User, user => user.dashboards)
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Visualization, visualization => visualization.dashboard)
  visualizations!: Visualization[];
}
```