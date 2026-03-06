```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './User';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  GUEST = 'guest', // Example for a less privileged role
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER, unique: true })
  name: UserRole;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => User, user => user.role)
  users: User[];
}
```