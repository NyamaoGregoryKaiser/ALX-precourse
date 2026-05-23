import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { Dataset } from '../../modules/datasets/entities/Dataset';
import { MLModel } from '../../modules/models/entities/MLModel';
import { ExperimentRun } from '../../modules/experiments/entities/ExperimentRun';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  username!: string;

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column()
  password!: string; // Hashed password

  @Column({ default: 'user' })
  role!: 'user' | 'admin';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Optional: Link user to their created datasets, models, experiments for future features
  @OneToMany(() => Dataset, dataset => dataset.createdBy)
  datasets!: Dataset[];

  @OneToMany(() => MLModel, model => model.createdBy)
  models!: MLModel[];

  @OneToMany(() => ExperimentRun, experiment => experiment.createdBy)
  experiments!: ExperimentRun[];
}
```