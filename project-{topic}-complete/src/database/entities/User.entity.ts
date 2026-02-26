import { Entity, Column, OneToMany, Unique } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { BaseEntity } from './BaseEntity';
import { Order } from './Order.entity';
import { Review } from './Review.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
@Unique(['email']) // Ensure email is unique
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false }) // Do not select password by default
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  // Relations
  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews!: Review[];

  /**
   * Hashes the user's password before saving it to the database.
   * This is a TypeORM hook that runs before insert or update.
   */
  async hashPassword(): Promise<void> {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  /**
   * Compares a plain-text password with the stored hashed password.
   * @param candidatePassword The plain-text password to compare.
   * @returns True if the passwords match, false otherwise.
   */
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}