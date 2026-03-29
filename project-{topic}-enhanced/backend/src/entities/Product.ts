```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User'; // Product is owned by a User

/**
 * Represents a Product entity in the database.
 * Includes product details and a relationship to the User who created it.
 */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false, length: 255 })
  @Index({ unique: true }) // Ensure product names are unique
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  // Many-to-one relationship with User
  // This means many Products can belong to one User
  @ManyToOne(() => User, user => user.products, { onDelete: 'CASCADE' }) // If user is deleted, their products are also deleted
  @JoinColumn({ name: 'userId' }) // The foreign key column in the 'products' table
  user!: User;

  @Column({ type: 'uuid' }) // The foreign key column for the User
  userId!: string;
}
```