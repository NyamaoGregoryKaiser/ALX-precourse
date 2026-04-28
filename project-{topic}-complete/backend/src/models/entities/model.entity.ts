import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PredictionLog } from '../../predictions/entities/prediction-log.entity';

@Entity('models')
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  version: string;

  @Column({ name: 'file_path', length: 255 })
  filePath: string; // Relative path to the model file

  @Column({ name: 'file_name', length: 255 })
  fileName: string; // Original file name

  @Column({ name: 'file_type', length: 50 })
  fileType: string; // Mime type (e.g., 'application/octet-stream', 'application/x-python-pickle')

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({ default: false })
  deployed: boolean;

  @Column({ name: 'deployment_url', length: 255, nullable: true })
  deploymentUrl: string; // Simulated URL or identifier for prediction endpoint

  @ManyToOne(() => User, (user) => user.models, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @OneToMany(() => PredictionLog, (predictionLog) => predictionLog.model)
  predictionLogs: PredictionLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}