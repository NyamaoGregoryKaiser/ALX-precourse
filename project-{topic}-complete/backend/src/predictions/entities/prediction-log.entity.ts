import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { User } from '../../users/entities/user.entity';

@Entity('prediction_logs')
export class PredictionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Model, (model) => model.predictionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: Model;

  @Column({ name: 'model_id' })
  modelId: string;

  @Column({ type: 'jsonb', name: 'input_data' })
  inputData: Record<string, any>;

  @Column({ type: 'jsonb', name: 'output_data' })
  outputData: Record<string, any>;

  @ManyToOne(() => User, (user) => user.predictionLogs, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ name: 'requested_by_id', nullable: true })
  requestedById: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;
}