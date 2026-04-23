import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Account } from './Account';
import { Payment } from './Payment';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  FEE = 'fee',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Account, account => account.id, { nullable: true })
  sourceAccount: Account; // For debit transactions

  @ManyToOne(() => Account, account => account.id, { nullable: true })
  destinationAccount: Account; // For credit transactions

  @ManyToOne(() => Payment, payment => payment.transactions, { nullable: true })
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}