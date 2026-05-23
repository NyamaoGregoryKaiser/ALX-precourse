import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../auth/entities/User';
import { MLModel } from '../../models/entities/MLModel';
import { Dataset } from '../../datasets/entities/Dataset';

@Entity('experiment_runs')
export class ExperimentRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp' })
  runAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  parametersJson?: object; // e.g., { feature_set: ['col1', 'col2'], algorithm: 'XGBoost' }

  @Column({ type: 'jsonb', nullable: true })
  metricsJson?: object; // e.g., { f1_score: 0.92, roc_auc: 0.96 }

  @Column({ nullable: true })
  artifactsUrl?: string; // URL to store model artifacts, logs, etc.

  @ManyToOne(() => MLModel, model => model.experiments, { onDelete: 'SET NULL', nullable: true })
  @Index()
  model?: MLModel;

  @Column({ type: 'uuid', nullable: true })
  modelId?: string; // Foreign key for the associated MLModel

  @ManyToOne(() => Dataset, dataset => dataset.experiments, { onDelete: 'SET NULL', nullable: true })
  @Index()
  dataset?: Dataset;

  @Column({ type: 'uuid', nullable: true })
  datasetId?: string; // Foreign key for the associated Dataset

  @ManyToOne(() => User, user => user.experiments, { onDelete: 'SET NULL', nullable: true })
  createdBy?: User;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
```