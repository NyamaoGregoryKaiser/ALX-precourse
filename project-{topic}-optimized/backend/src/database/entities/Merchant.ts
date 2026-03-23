```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { User } from './User';
import { Transaction } from './Transaction';
import { Account } from './Account';

@Entity('merchants')
export class Merchant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ unique: true, nullable: true })
    businessEmail: string;

    @Column({ nullable: true })
    address: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    balance: number; // Balance held by the payment processor for this merchant

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // A merchant is associated with a user (the one who registered the merchant account)
    // For simplicity, let's assume one user manages one merchant directly.
    @ManyToOne(() => User, user => user.merchants)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'uuid', nullable: false })
    userId: string; // Foreign key

    // A merchant can have many transactions (as a receiver)
    @OneToMany(() => Transaction, transaction => transaction.merchant)
    transactions: Transaction[];

    // A merchant can have multiple bank accounts for payouts
    @OneToMany(() => Account, account => account.merchant)
    accounts: Account[];
}
```