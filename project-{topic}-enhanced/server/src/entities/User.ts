import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent
} from 'typeorm';
import { UserRole } from './UserRole';
import { RefreshToken } from './RefreshToken';
import { Exclude } from 'class-transformer'; // For excluding password from JSON responses

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false }) // Exclude password by default in queries
  password!: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => UserRole, userRole => userRole.user)
  userRoles!: UserRole[];

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens!: RefreshToken[];

  // Helper to get roles
  async getRoles(): Promise<string[]> {
    if (!this.userRoles) {
      // Potentially load them if not eagerly loaded
      // This is a simplified example, in a real app you might use a service
      return [];
    }
    return this.userRoles.map(ur => ur.role.name);
  }

  // Helper to get permissions (this would typically be handled by a service joining User -> UserRole -> Role -> RolePermission -> Permission)
  // For demonstration, this is a placeholder. Real implementation needs a proper query.
  async getPermissions(): Promise<string[]> {
    // This requires proper eager loading or a specific query
    // Example: userRepo.findOne({ relations: ['userRoles.role.rolePermissions.permission'] })
    if (!this.userRoles || this.userRoles.length === 0) {
      return [];
    }

    const permissions: Set<string> = new Set();
    for (const userRole of this.userRoles) {
      if (userRole.role && userRole.role.rolePermissions) {
        for (const rp of userRole.role.rolePermissions) {
          if (rp.permission) {
            permissions.add(rp.permission.name);
          }
        }
      }
    }
    return Array.from(permissions);
  }
}