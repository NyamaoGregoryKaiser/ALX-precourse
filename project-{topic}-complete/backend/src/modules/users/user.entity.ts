```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Order } from '../orders/order.entity';
import { Cart } from '../carts/cart.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  firstName!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  lastName!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email!: string;

  @Column({ type: 'varchar', nullable: false, select: false }) // Do not select password by default
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => Order, order => order.user)
  orders!: Order[];

  @OneToMany(() => Cart, cart => cart.user)
  cart!: Cart; // One user has one cart (conceptually, but cart might be a collection of items)

  // Hooks for password hashing
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && (this.isNew || this.isModified('password'))) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Helper to check password
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Dummy property to check if it's a new instance (TypeORM does not have this directly)
  // This would typically be handled by checking if 'id' exists, or by passing a flag.
  // For `BeforeInsert`, it's implicitly new. For `BeforeUpdate`, it's implicitly existing.
  private isNew: boolean = false;
  private modifiedFields: Set<string> = new Set();

  setNew(isNew: boolean) {
    this.isNew = isNew;
  }

  markModified(field: string) {
    this.modifiedFields.add(field);
  }

  isModified(field: string): boolean {
    return this.modifiedFields.has(field);
  }
}
```