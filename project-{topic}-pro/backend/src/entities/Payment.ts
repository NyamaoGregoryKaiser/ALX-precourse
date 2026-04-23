import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Merchant } from './Merchant';
import { Transaction } from './Transaction';

export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  USSD = 'ussd',
  WALLET = 'wallet',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ nullable: true })
  externalId: string; // ID from external payment gateway

  @Column({ nullable: true, type: 'jsonb' })
  metadata: object; // Additional payment details (e.g., card last4, expiry)

  @ManyToOne(() => Merchant, merchant => merchant.payments)
  merchant: Merchant;

  @Column({ nullable: true })
  customerEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Transaction, transaction => transaction.payment)
  transactions: Transaction[];
}