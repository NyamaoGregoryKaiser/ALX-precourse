```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './Project.entity';
import { Metric } from './Metric.entity';
import { Alert } from './Alert.entity';

export enum MonitorMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export enum MonitorStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

@Entity('monitors')
export class Monitor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  url!: string;

  @Column({ type: 'enum', enum: MonitorMethod, default: MonitorMethod.GET, nullable: false })
  method!: MonitorMethod;

  @Column({ name: 'interval_seconds', type: 'integer', default: 60, nullable: false })
  intervalSeconds!: number; // How often to check, in seconds

  @Column({ type: 'enum', enum: MonitorStatus, default: MonitorStatus.ACTIVE, nullable: false })
  status!: MonitorStatus;

  @Column({ name: 'project_id', type: 'uuid', nullable: false })
  projectId!: string;

  @ManyToOne(() => Project, project => project.monitors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => Metric, metric => metric.monitor)
  metrics!: Metric[];

  @OneToMany(() => Alert, alert => alert.monitor)
  alerts!: Alert[];

  @Column({ name: 'last_check_at', type: 'timestamp', nullable: true })
  lastCheckAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
```