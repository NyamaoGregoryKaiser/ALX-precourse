```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsEmail, Length, IsEnum, IsArray } from 'class-validator';
import { Service } from './Service';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  SERVICE_OWNER = 'service_owner',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  username!: string;

  @Column({ unique: true })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @Column()
  @Length(6, 100, { message: 'Password must be at least 6 characters long' })
  passwordHash!: string;

  @Column({ type: 'jsonb', default: [UserRole.USER] })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid user role' })
  roles!: UserRole[];

  @OneToMany(() => Service, (service) => service.user)
  services!: Service[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```