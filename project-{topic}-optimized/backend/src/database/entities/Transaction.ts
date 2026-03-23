```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Merchant } from './Merchant';

export enum TransactionType {
    PAYMENT = 'PAYMENT',
    REFUND = 'REFUND',
    WITHDRAWAL = 'WITHDRAWAL', // Merchant withdrawing funds
    DEPOSIT = 'DEPOSIT', // Funds added to merchant balance
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ length: 3 }) // e.g., USD, EUR
    currency: string;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true, unique: true }) // ID from external payment gateway
    externalTransactionId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Flexible field for additional transaction details

    @Column({ type: 'timestamp with time zone', nullable: true })
    processedAt: Date; // When the transaction was actually completed/failed by gateway

    @Column({ nullable: true })
    failureReason: string;

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // Relationship with the User who initiated the transaction (payer)
    @ManyToOne(() => User, user => user.initiatedTransactions)
    @JoinColumn({ name: 'initiatorUserId' })
    initiatorUser: User;

    @Column({ type: 'uuid', nullable: false })
    initiatorUserId: string;

    // Relationship with the Merchant who is receiving the payment
    @ManyToOne(() => Merchant, merchant => merchant.transactions)
    @JoinColumn({ name: 'merchantId' })
    merchant: Merchant;

    @Column({ type: 'uuid', nullable: false })
    merchantId: string;
}
```