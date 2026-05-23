import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../../auth/entities/User';
import { Dataset } from '../../datasets/entities/Dataset';
import { ExperimentRun } from '../../experiments/entities/ExperimentRun';

@Entity('ml_models')
export class MLModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({ default: '1.0.0' })
  version!: string;

  @Column({ nullable: true })
  framework?: string; // e.g., 'Scikit-learn', 'TensorFlow', 'PyTorch'

  @Column({ nullable: true })
  type?: string; // e.g., 'Classification', 'Regression', 'Clustering'

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metricsJson?: object; // e.g., { accuracy: 0.95, precision: 0.88 }

  @Column({ type: 'jsonb', nullable: true })
  hyperparametersJson?: object; // e.g., { learning_rate: 0.01, n_estimators: 100 }

  @CreateDateColumn({ type: 'timestamp' })
  trainedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => Dataset, dataset => dataset.models, { onDelete: 'SET NULL', nullable: true })
  @Index()
  dataset?: Dataset;

  @Column({ type: 'uuid', nullable: true })
  datasetId?: string; // Foreign key for the associated dataset

  @ManyToOne(() => User, user => user.models, { onDelete: 'SET NULL', nullable: true })
  createdBy?: User;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @OneToMany(() => ExperimentRun, experiment => experiment.model)
  experiments!: ExperimentRun[];
}
```