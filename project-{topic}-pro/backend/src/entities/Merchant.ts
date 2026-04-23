import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from './User';
import { Payment } from './Payment';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  businessAddress: string;

  @Column({ unique: true, nullable: true })
  publicKey: string; // For API integrations

  @Column({ unique: true, nullable: true })
  secretKey: string; // For API integrations, should be hashed/encrypted in real-world

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  balance: number;

  @ManyToOne(() => User, user => user.merchants)
  owner: User; // The user account managing this merchant

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Payment, payment => payment.merchant)
  payments: Payment[];
}