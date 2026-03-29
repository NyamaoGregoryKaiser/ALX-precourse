import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './User';
import { Role } from './Role';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn()
  userId!: string;

  @PrimaryColumn()
  roleId!: string;

  @ManyToOne(() => User, user => user.userRoles, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Role, role => role.userRoles, { eager: true, onDelete: 'CASCADE' }) // Eager load role for convenience
  role!: Role;
}