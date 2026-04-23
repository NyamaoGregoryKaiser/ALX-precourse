import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './User';
import { Transaction } from './Transaction';

export enum AccountType {
  SAVINGS = 'savings',
  CHECKING = 'checking',
  MERCHANT_WALLET = 'merchant_wallet',
  EXTERNAL = 'external', // For external bank accounts linked by user
}

@Entity('accounts')
@Index(['user', 'accountType'], { unique: true, where: `"accountType" != 'external'` }) // Unique per user for non-external accounts
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  balance: number;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.CHECKING })
  accountType: AccountType;

  @Column({ nullable: true })
  currency: string; // e.g., 'USD', 'NGN'

  @ManyToOne(() => User, user => user.accounts)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}