```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Transaction } from './Transaction';
import { Merchant } from './Merchant';

export enum UserRole {
    USER = 'USER', // Can make payments
    MERCHANT = 'MERCHANT', // Owns a business, receives payments
    ADMIN = 'ADMIN', // Manages the platform
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false }) // Do not select password by default
    password: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
    role: UserRole;

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // A user can initiate many transactions (as a payer)
    @OneToMany(() => Transaction, transaction => transaction.initiatorUser)
    initiatedTransactions: Transaction[];

    // A user can be associated with a merchant (if their role is MERCHANT)
    @OneToMany(() => Merchant, merchant => merchant.user)
    merchants: Merchant[]; // A user can potentially manage multiple merchants, or just one
}
```