```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Product } from './Product'; // Assuming a User can create many Products

/**
 * Represents a User entity in the database.
 * Includes authentication details and basic user information.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') // Universally Unique Identifier for primary key
  id!: string;

  @Column({ unique: true, nullable: false })
  email!: string;

  @Column({ nullable: false })
  password!: string; // Hashed password

  @Column({ default: 'user' }) // Example role: 'admin', 'user'
  role!: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  // Define a one-to-many relationship with Products
  // This means one User can own multiple Products
  @OneToMany(() => Product, product => product.user)
  products!: Product[];
}
```