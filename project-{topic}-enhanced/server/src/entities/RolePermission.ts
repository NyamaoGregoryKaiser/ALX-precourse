import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from './Role';
import { Permission } from './Permission';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn()
  roleId!: string;

  @PrimaryColumn()
  permissionId!: string;

  @ManyToOne(() => Role, role => role.rolePermissions, { onDelete: 'CASCADE' })
  role!: Role;

  @ManyToOne(() => Permission, permission => permission.rolePermissions, { eager: true, onDelete: 'CASCADE' }) // Eager load permission
  permission!: Permission;
}