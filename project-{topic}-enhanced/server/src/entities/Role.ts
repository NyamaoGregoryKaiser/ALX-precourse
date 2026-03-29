import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './UserRole';
import { RolePermission } from './RolePermission';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string; // e.g., 'admin', 'user', 'editor'

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles!: UserRole[];

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
  rolePermissions!: RolePermission[];
}