import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('datasets')
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'file_path', length: 255 })
  filePath: string; // Relative path on the server/storage

  @Column({ name: 'file_name', length: 255 })
  fileName: string; // Original file name

  @Column({ name: 'file_type', length: 50 })
  fileType: string; // Mime type or extension (e.g., 'text/csv', 'application/json')

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @ManyToOne(() => User, (user) => user.datasets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}