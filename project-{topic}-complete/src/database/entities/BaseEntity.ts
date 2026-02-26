import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BaseEntity as TypeOrmBaseEntity } from 'typeorm';

/**
 * BaseEntity provides common fields for all other entities:
 * - id: Primary key, UUID generated
 * - createdAt: Timestamp for creation date
 * - updatedAt: Timestamp for last update date
 */
export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}