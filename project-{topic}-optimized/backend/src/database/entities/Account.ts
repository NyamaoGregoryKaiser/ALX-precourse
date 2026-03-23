```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Merchant } from './Merchant';

export enum AccountType {
    CHECKING = 'CHECKING',
    SAVINGS = 'SAVINGS',
    BUSINESS = 'BUSINESS',
}

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    bankName: string;

    @Column()
    accountNumber: string;

    @Column({ nullable: true })
    routingNumber: string; // Or SWIFT/IBAN for international

    @Column({ type: 'enum', enum: AccountType, default: AccountType.CHECKING })
    type: AccountType;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isPrimary: boolean;

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @ManyToOne(() => Merchant, merchant => merchant.accounts)
    @JoinColumn({ name: 'merchantId' })
    merchant: Merchant;

    @Column({ type: 'uuid', nullable: false })
    merchantId: string; // Foreign key
}
```