```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import bcrypt from 'bcryptjs';
import { Database } from './Database';
import { SlowQuery } from './SlowQuery';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Database, (database) => database.owner)
  databases!: Database[];

  @OneToMany(() => SlowQuery, (query) => query.reporter)
  reportedQueries!: SlowQuery[];

  /**
   * Hashes the user's password before saving.
   * @param password The plain text password.
   * @returns {Promise<string>} The hashed password.
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, salt);
    return this.password;
  }

  /**
   * Compares a given password with the stored hashed password.
   * @param password The plain text password to compare.
   * @returns {Promise<boolean>} True if passwords match, false otherwise.
   */
  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
```

#### `backend/src/entities/Database.ts`