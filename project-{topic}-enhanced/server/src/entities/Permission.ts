import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RolePermission } from './RolePermission';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string; // e.g., 'user:read', 'user:write', 'product:delete'

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions!: RolePermission[];
}