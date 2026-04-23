import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Account } from './Account';
import { Merchant } from './Merchant';

export enum UserRole {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string; // Storing hashed password

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Account, account => account.user)
  accounts: Account[];

  @OneToMany(() => Merchant, merchant => merchant.owner)
  merchants: Merchant[];
}