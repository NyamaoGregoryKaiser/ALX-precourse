import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../../auth/entities/User';
import { MLModel } from '../../models/entities/MLModel';
import { ExperimentRun } from '../../experiments/entities/ExperimentRun';

@Entity('datasets')
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: '1.0.0' })
  version!: string;

  @Column({ type: 'jsonb', nullable: true })
  schemaJson?: object; // Stores parsed schema of the dataset (e.g., column names, types)

  @Column({ nullable: true })
  fileUrl?: string; // Path or URL to the uploaded dataset file (e.g., CSV)

  @CreateDateColumn({ type: 'timestamp' })
  uploadedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.datasets, { onDelete: 'SET NULL', nullable: true })
  createdBy?: User;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @OneToMany(() => MLModel, model => model.dataset)
  models!: MLModel[];

  @OneToMany(() => ExperimentRun, experiment => experiment.dataset)
  experiments!: ExperimentRun[];
}
```